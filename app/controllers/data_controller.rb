require 'google/apis/analytics_v3'

class DataController < ApplicationController

  def recent
    minutes = params[:minutes] ? params[:minutes].to_i : 60
    @result = recent_readers(minutes)
    respond_to do |format|
      format.html
      format.json { render :json => @result }
    end
  end
  
  private
  
    # Get recent readership data as an array of arrays.
    def recent_readers(minutes)
      last_query = Timestamp.find_by(key: 'last_query')
      if !last_query || last_query.time < 10.minutes.ago
        update_readers
        update_locations
      end
      
      readers = Reader.where(time: minutes.minutes.ago..Time.now)
                .order(time: :desc)
                .to_a
      rows = []
      readers.each do |reader|
        city = Location.find_by(city: reader.city,
                                latitude: reader.latitude,
                                longitude: reader.longitude)
        unless uri_excluded?(reader.path)
          rows.push([reader.time.iso8601,
                     city.country,
                     city.region,
                     reader.city,
                     reader.latitude,
                     reader.longitude,
                     reader.title,
                     ENV['URI_HOST'] + reader.path,
                     reader.activity,
                     reader.count])
        end
      end
      { 'rows' => rows }
    end
    
    # Get regions and countries for the cities in the readership data.
    def update_locations
      metrics = 'ga:pageviews,ga:totalEvents'
      dims = 'ga:city,ga:latitude,ga:longitude,ga:region,ga:country'
      filters = 'ga:city!=(not set)'
      sort = nil
      max = 100000
      
      rows = query('today', 'today', metrics, dims, filters, sort, max)
      if rows.nil?
        return false
      end
      
      rows.each do |row|
        city = Location.new(city: row[0], latitude: row[1], longitude: row[2],
                            region: row[3], country: row[4])
        begin
          city.save
        rescue ActiveRecord::RecordNotUnique
          logger.debug("Skipping duplicate city: #{city}")
        end
      end
      
      true
    end
    
    # Update database with most recent readership data.
    def update_readers
      update_readers_for_activity('view')
      update_readers_for_activity('download')
    end
    
    # Get up-to-date 'view' (pageview) or 'download' data.
    def update_readers_for_activity(activity)
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
    def query(start_date, end_date, metrics, dimensions,
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
    
    # Remove query from URI path.
    def remove_query(path)
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
    
    # Determine whether URI should be excluded.
    def uri_excluded?(uri)
      excluded_uris = ENV['EXCLUDED_URIS'] ?
        ENV['EXCLUDED_URIS'].split(';') : []
      excluded_uris.each do |pattern|
        if /#{pattern}/ =~ uri
          return true
        end
      end
      false
    end
end
