class DataController < ApplicationController

  def recent
    minutes = params[:minutes] ? params[:minutes].to_i : 60
    @result = get_recent(minutes)
    respond_to do |format|
      format.html
      format.json { render :json => @result }
    end
  end
  
  private
  
    # Get recent readership data.
    def get_recent(minutes)
      readers = Reader.recent(minutes)
      City.update_for_today
      unless readers
        return { 'error' => 'There was an error' }
      end
      rows = []
      readers.each do |reader|
        city = City.find_by(city: reader.city,
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
