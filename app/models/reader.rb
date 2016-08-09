require 'google/apis/analytics_v3'

class Reader < ActiveRecord::Base
  validates :time, uniqueness: {
    scope: [:latitude, :longitude, :path, :activity] }

  def self.recent(minutes)
    last_query = Timestamp.find_by(key: 'last_query')
    if !last_query || Time.now - last_query.time > 10.minutes
      unless update_cache
        return nil
      end
    end
    Reader.where(time: minutes.minutes.ago..Time.now)
          .order(time: :desc)
          .to_a
  end
  
  def self.clean(days)
    Reader.where('time < ?', days.days.ago).delete_all
  end
  
  def self.update_cache
    update_cache_for_activity('view')
    update_cache_for_activity('download')
  end

  private

    # Remove query from URI path.
    def self.remove_query(path)
      query_start = path.index('?')
      unless query_start.nil?
        if query_start == 0
          return ''
        else
          return path[0..query_start-1]
        end
      end
      path
    end

    def self.update_cache_for_activity(activity)
      # A maximum of 7 dimensions can be used in each query,
      # so we query multiple times using a set of dimensions,
      # e.g. (hour, minute, city, pagePath), as a 'key' that
      # guarantees the query results can be merged by simply
      # matching the rows from each set of results. 
      #
      # The non-key dimensions must not be more specific
      # than the key, so that there are not multiple
      # rows returned with the same key.
      if activity == 'download'
        metrics = 'ga:totalEvents'
      else
        metrics = 'ga:pageviews'
      end
      dims = 'ga:hour,ga:minute,ga:city,ga:latitude,ga:longitude,'
      dims += 'ga:pageTitle,ga:pagePath'

      # Filter out records without location data.
      filters = 'ga:city!=(not set)'
      if activity == 'download'
        filters += ';ga:eventCategory==Bitstream'
        filters += ';ga:eventAction==Download'
      end

      # Get most recent records.
      sort = '-ga:hour,-ga:minute'

      # Set this so that the results definitely will
      # go back far enough in time.
      max = 100000

      rows = query('today', 'today', metrics, dims, filters, sort, max)
      if rows.nil?
        return false
      end

      # If GA_UTC_OFFSET is not set, treats time in the GA data
      # as if it is in the local time where this app runs.
      now = Time.now.getlocal(ENV['GA_UTC_OFFSET'])

      rows.each do |row|
        time = Time.new(now.year, now.month, now.day, row[0], row[1], 0,
                        ENV['GA_UTC_OFFSET'])
        path = remove_query(row[6])
        reader = Reader.new(time: time,
                            city: row[2], latitude: row[3], longitude: row[4],
                            title: row[5], path: path,
                            activity: activity, count: row[7])
        begin
          reader.save
        rescue ActiveRecord::RecordNotUnique
          logger.debug("Skipping duplicate reader: #{reader}")
        end
      end

      last_query = Timestamp.find_or_create_by(key: 'last_query')
      last_query.time = now
      last_query.save

      true
    end
  
    # Query for Google Analytics data.
    def self.query(start_date, end_date, metrics, dimensions,
                   filters, sort, max)
      service = Google::Apis::AnalyticsV3::AnalyticsService.new
      service.authorization = Signet::OAuth2::Client.new(
        {
          issuer: ENV['GSA_CLIENT_EMAIL'],
          scope: 'https://www.googleapis.com/auth/analytics.readonly',
          token_credential_uri: 'https://www.googleapis.com/oauth2/v3/token',
          audience: 'https://www.googleapis.com/oauth2/v3/token',
          signing_key: OpenSSL::PKey::RSA.new(
            ENV['GSA_PRIVATE_KEY'].gsub("\\n", "\n")),
        })
      service.authorization.fetch_access_token!
      service.get_ga_data(ENV['GA_PROFILE_ID'],
                          start_date,
                          end_date,
                          metrics,
                          dimensions: dimensions,
                          filters: filters,
                          sort: sort,
                          max_results: max) do |result, err|
        if err
          return nil
        elsif result.rows.nil?
          return []
        else
          return result.rows
        end
      end
    end
end
