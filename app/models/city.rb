class City < ActiveRecord::Base
  validates :city, uniqueness: { scope: [:latitude, :longitude] }

  def self.update_for_today
    metrics = 'ga:pageviews,ga:totalEvents'
    dims = 'ga:city,ga:latitude,ga:longitude,ga:region,ga:country'
    filters = 'ga:city!=(not set)'
    sort = nil
    max = 100000
    rows = query('today', 'today', metrics, dims, filters, sort, max)
    unless rows.nil?
      rows.each do |row|
        city = City.new(city: row[0], latitude: row[1], longitude: row[2],
                        region: row[3], country: row[4])
        begin
          city.save
        rescue ActiveRecord::RecordNotUnique
          logger.debug("Skipping duplicate city: #{city}")
        end
      end
    end
  end
  
  private
  
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
