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
      pageviews.map! do |pageview|
        pageview = [pageview.time.iso8601,
                    pageview.country,
                    pageview.region,
                    pageview.city,
                    pageview.latitude,
                    pageview.longitude,
                    pageview.title,
                    remove_query(pageview.uri),
                    pageview.count]
      end
      { 'rows' => pageviews }
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
