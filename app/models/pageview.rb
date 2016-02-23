require 'google/apis/analytics_v3'

class Pageview < ActiveRecord::Base
  validates :time, uniqueness: { scope: [:city, :host, :path] }
  
  def self.recent(last)
    last_query = Timestamp.find_by(key: 'last_query')
    if !last_query || Time.now - last_query.time > 5.minutes
      unless update_cache
        return nil
      end
    end
    if last > 60
      last = 60
    end
    Pageview.where(time: last.minutes.ago..Time.now)
            .order(time: :desc)
            .to_a
  end
  
  private
  
    def self.update_cache
      # A maximum of 7 dimensions can be used in each query,
      # so we query multiple times using a set of dimensions,
      # e.g. (hour, minute, city, pagePath), as a 'key' that
      # guarantees the query results can be merged by simply
      # matching the rows from each set of results. 
      #
      # The non-key dimensions must not be more specific
      # than the key, so that there are not multiple
      # rows returned with the same key.
      metrics = 'ga:pageviews'
      dims_key = 'ga:hour,ga:minute,ga:city,ga:hostName,ga:pagePath'
      dims_1 = dims_key + ',ga:country,ga:region'
      dims_2 = dims_key + ',ga:latitude,ga:longitude'
      dims_3 = dims_key + ',ga:pageTitle,ga:language'

      # Filter out records without location data.
      filters = 'ga:city!=(not set)'

      # Get most recent records.
      sort = '-ga:hour,-ga:minute'

      # Set this so that the results definitely will
      # go back far enough in time.
      max = 300

      rows_1 = query('today', 'today', metrics, dims_1, filters, sort, max)
      rows_2 = query('today', 'today', metrics, dims_2, filters, sort, max)
      rows_3 = query('today', 'today', metrics, dims_3, filters, sort, max)
      if rows_1.nil? || rows_2.nil? || rows_3.nil?
        return false
      end

      # Assumes local time zone is same as the data time zone.
      now = Time.now

      rows_1.each do |row|
        time = Time.new(now.year, now.month, now.day, row[0], row[1])
        pageview = new(time: time, city: row[2], host: row[3], path: row[4],
                       country: row[5], region: row[6], count: row[7])
        pageview.save
      end

      rows_2.each do |row|
        time = Time.new(now.year, now.month, now.day, row[0], row[1])
        existing = find_by(time: time, city: row[2],
                           host: row[3], path: row[4])
        if existing
          existing.latitude = row[5]
          existing.longitude = row[6]
          existing.save
        end
      end

      rows_3.each do |row|
        time = Time.new(now.year, now.month, now.day, row[0], row[1])
        existing = find_by(time: time, city: row[2],
                           host: row[3], path: row[4])
        if existing
          existing.title = row[5]
          existing.language = row[6]
          existing.save
        end
      end

      # Drop incomplete records.
      where(latitude: nil).destroy_all
      where(title: nil).destroy_all

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
          puts err
          return nil
        elsif result.rows.nil?
          return []
        else
          return result.rows
        end
      end
    end
end
