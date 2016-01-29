require 'google/apis/analytics_v3'

class Pageview < ActiveRecord::Base
  validates :time, uniqueness: { scope: [:city, :uri] }
  
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
      dims_key = 'ga:hour,ga:minute,ga:city,ga:pagePath'
      dims_1 = dims_key + ',ga:country,ga:region,ga:latitude'
      dims_2 = dims_key + ',ga:longitude,ga:pageTitle,ga:hostName'
      # Filter out records with invalid location.
      filters = 'ga:city!=(not set)'
      # Below, we assume the two sets of results are both
      # sorted in descending time order.
      sort = '-ga:hour,-ga:minute,-ga:city,-ga:pagePath'
      # Set this so that the results definitely will
      # go back far enough in time.
      max = 600
      rows_1 = query('today', 'today', metrics, dims_1,
                     filters, sort, max)
      rows_2 = query('today', 'today', metrics, dims_2,
                     filters, sort, max)
      if rows_1.nil? || rows_2.nil?
        return false
      end
      rows_diff = rows_1.length - rows_2.length
      if rows_diff > 0
        rows_1 = rows_1[rows_diff..-1]
      elsif rows_diff < 0
        rows_diff *= -1
        rows_2 = [rows_diff..-1]
      end
      # Assumes local time zone is same as the data time zone.
      now = Time.now
      (0..rows_1.length-1).each do |i|
        uri = rows_2[i][6] + rows_1[i][3]
        if uri_excluded?(uri)
          next
        end
        time = Time.new(
          now.year,
          now.month,
          now.day,
          rows_1[i][0],
          rows_1[i][1])
        pageview = new(
          time: time,
          country: rows_1[i][4],
          region: rows_1[i][5],
          city: rows_1[i][2],
          latitude: rows_1[i][6],
          longitude: rows_2[i][4],
          title: rows_2[i][5],
          uri: uri,
          count: rows_1[i][7])
        # Many of these are expected to fail to save because
        # the pageview is already in the database.
        pageview.save
      end
      last_query = Timestamp.find_or_create_by(key: 'last_query')
      last_query.time = now
      last_query.save
      true
    end

    # Determine whether URI should be excluded.
    def self.uri_excluded?(uri)
      excluded_uris = ENV['EXCLUDED_URIS'] ?
        ENV['EXCLUDED_URIS'].split(';') : []
      excluded_uris.each do |pattern|
        if /#{pattern}/ =~ uri
          return true
        end
      end
      false
    end
    
    # Query for Google Analytics data.
    def self.query(start_date, end_date, metrics, dimensions,
                   filters, sort, max)
      service = Google::Apis::AnalyticsV3::AnalyticsService.new
      scopes = ['https://www.googleapis.com/auth/analytics.readonly']
      service.authorization = Google::Auth.get_application_default(scopes)
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
