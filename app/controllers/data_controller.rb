class DataController < ApplicationController

  def recent
    @result = get_recent(params[:last])
    respond_to do |format|
      format.html
      format.json { render :json => @result }
    end
  end
  
  private
  
    # Get recent readership data.
    def get_recent(last)
      last = last ? last.to_i : 60
      pageviews = Pageview.recent(last)
      unless pageviews
        return { 'error' => 'There was an error' }
      end
      rows = []
      pageviews.each do |pageview|
        uri = pageview.host + remove_query(pageview.path)
        unless uri_excluded?(uri)
          rows.push([pageview.time.iso8601,
                     pageview.country,
                     pageview.region,
                     pageview.city,
                     pageview.latitude,
                     pageview.longitude,
                     pageview.title,
                     uri,
                     pageview.count])
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
