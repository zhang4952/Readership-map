class DataController < ApplicationController

  def recent
    @result = get_recent
    respond_to do |format|
      format.html
      format.json { render :json => @result }
    end
  end
  
  private
  
    # Get recent readership data.
    def get_recent
      readers = Reader.recent
      unless readers
        return { 'error' => 'There was an error' }
      end
      rows = []
      readers.each do |reader|
        uri = reader.host + reader.path
        unless uri_excluded?(uri)
          rows.push([reader.time.iso8601,
                     reader.country,
                     reader.region,
                     reader.city,
                     reader.latitude,
                     reader.longitude,
                     reader.title,
                     uri,
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
