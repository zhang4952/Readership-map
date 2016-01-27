class DataController < ApplicationController

  def pageviews
    @result = get_pageviews
    respond_to do |format|
      format.html
      format.json { render :json => @result }
    end
  end

  private
  
    # Get most recent pageviews.
    def get_pageviews
      pageviews = Pageview.by_minute(60)
      unless pageviews
        return { 'error' => 'There was an error.' }
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
      return path
    end
end
