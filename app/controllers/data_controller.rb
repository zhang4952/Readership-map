require 'google/apis/analytics_v3'

class DataController < ApplicationController

  # Readership data from the past 'minutes' minutes.
  def recent
    minutes = params[:minutes] ? params[:minutes].to_i : 60
    if configured?
      @result = recent_readers(minutes)
    else
      @result = { 'error' => 'The application is not properly configured.' }
      logger.error('Cannot retrieve data: A required configuration variable has not been set.')
    end
    respond_to do |format|
      format.html
      format.json { render :json => @result }
    end
  end
  
  private
  
    # Check for the necessary configuration variables.
    def configured?
      ENV['GA_PROFILE_ID'] && ENV['GSA_CLIENT_EMAIL'] && ENV['GSA_PRIVATE_KEY']
    end
    
    # Get recent readership data as an array of arrays.
    def recent_readers(minutes)
      last_query = Timestamp.find_by(key: 'last_query')
      if !last_query || last_query.time < 10.minutes.ago
        update_locations
        update_readers
        unless last_query
          last_query = Timestamp.new(key: 'last_query')
        end
        last_query.time = Time.now
        last_query.save
      end
      
      readers = Reader.where(time: minutes.minutes.ago..Time.now)
                      .order(time: :desc).to_a
      rows = []
      readers.each do |reader|
        rows.push([reader.time.iso8601,
                   reader.country,
                   reader.region,
                   reader.city,
                   reader.latitude,
                   reader.longitude,
                   reader.title,
                   reader.uri,
                   reader.activity,
                   reader.count])
      end
      { 'rows' => rows }
    end
    
    # Get regions and countries for cities in the readership data.
    def update_locations
      metrics = 'ga:pageviews,ga:totalEvents'
      dims = 'ga:cityId,ga:country,ga:region,ga:city,ga:latitude,ga:longitude'
      filters = 'ga:city!=(not set)'
      sort = nil
      max = 10000
      
      rows = query('today', 'today', metrics, dims, filters, sort, max)
      if rows.nil?
        return false
      end
      
      rows.each do |row|
        loc = Location.find_or_create_by(cityId: row[0])
        loc.country = (row[1] != '(not set)') ? row[1] : nil
        loc.region = (row[2] != '(not set)') ? row[2] : nil
        loc.city = row[3]
        loc.latitude = row[4]
        loc.longitude = row[5]
        loc.save
      end
    end
    
    # Update database with most recent readership data.
    def update_readers
      update_readers_for_activity('view')
      update_readers_for_activity('download')
    end
    
    # Get up-to-date 'view' (pageview) or 'download' data.
    def update_readers_for_activity(activity)
      if activity == 'download'
        metrics = 'ga:totalEvents'
      else
        metrics = 'ga:pageviews'
      end
      dims = 'ga:hour,ga:minute,ga:cityId,ga:pageTitle,ga:hostName,ga:pagePath'
      filters = 'ga:cityId!=(not set)'
      if ENV['GA_FILTERS']
        filters += ';' + ENV['GA_FILTERS']
      end
      if activity == 'download'
        filters += ';ga:eventCategory==Bitstream'
        filters += ';ga:eventAction==Download'
      end
      sort = '-ga:hour,-ga:minute'
      max = 10000
      
      rows = query('today', 'today', metrics, dims, filters, sort, max)
      if rows.nil?
        return false
      end
      
      # If GA_UTC_OFFSET is not set, treats time in the GA data
      # as if it is in the local time where this app runs.
      now = Time.now.getlocal(ENV['GA_UTC_OFFSET'])
      
      Reader.where(activity: activity).delete_all
      save_reader_rows(rows, now, activity)
      
      # If it's just after midnight in the timezone of the
      # Google Analytics profile, get yesterday's data also.
      if now < now.at_midnight + 1.hour
        yesterday_rows = query('yesterday', 'yesterday', metrics, dims,
                               filters, sort, max)
        unless yesterday_rows.nil?
          day_ago = now - 1.day
          save_reader_rows(yesterday_rows, day_ago, activity)
        end
      end
      
      true
    end
    
    # Save rows of reader data in database.
    def save_reader_rows(rows, ref_time, activity)
      rows.each do |row|
        time = Time.new(ref_time.year, ref_time.month, ref_time.day,
                        row[0], row[1], 0, ENV['GA_UTC_OFFSET'])
        loc = Location.find_by(cityId: row[2])
        unless loc.nil?
          path = remove_query(row[5])
          Reader.create(time: time,
                        country: loc.country,
                        region: loc.region,
                        city: loc.city,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        title: row[3],
                        uri: row[4] + path,
                        activity: activity,
                        count: row[6])
        end
      end
    end
    
    # Query for Google Analytics data. There can be at most 7 dimensions,
    # and the 'max' number of results can be at most 10,000.
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
end
