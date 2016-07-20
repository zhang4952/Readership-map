class DataController < ApplicationController

  def recent
    minutes = params[:minutes].to_i
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
      unless readers
        return { 'error' => 'There was an error' }
      end
      rows = []
      readers.each do |reader|
        uri = reader.host + remove_query(reader.path)
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
