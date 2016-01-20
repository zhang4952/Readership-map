require 'googleauth'
require 'google/apis/analytics_v3'

class DataController < ApplicationController
  def pageviews
    @result = get_pageviews
    respond_to do |format|
      format.html
      format.json { render :json => @result }
    end
  end

  private

    # A maximum of 7 dimensions can be used in each query,
    # so we query multiple times using a set of dimensions,
    # e.g. (hour, minute, city, pagePath), as a 'key' that
    # guarantees the query results can be merged by simply
    # matching the rows from each set of results. 
    #
    # The non-key dimensions must not be more specific
    # than the key, so that there are not multiple
    # rows returned with the same key.

    # Get pageviews by time and location.
    def get_pageviews
      last_query = Timestamp.find_by(key: 'last_query')
      if !last_query or Time.now - last_query.time > 10.minutes
        #profile = 'ga:111738246' # Test Repository / All Website Data
        #profile = 'ga:71605766'  # OSU Libraries / All Website Data
        profile = 'ga:71605283'  # OSU Libraries / Scholars Archive Production
        metrics = 'ga:pageviews'
        dims_key = 'ga:hour,ga:minute,ga:city,ga:pagePath'
        dims_1 = dims_key + ',ga:country,ga:region,ga:latitude'
        dims_2 = dims_key + ',ga:longitude,ga:pageTitle,ga:hostName'
        # Filter out incomplete records, spam, etc.
        filters = 'ga:city!=(not set)'
        #filters += ';ga:hostName==ir.library.oregonstate.edu'
        # Identical sorting is assumed when merging.
        sort = '-ga:hour,-ga:minute,-ga:city,-ga:pagePath'
        rows_1 = query(profile, metrics, dims_1, filters, sort)
        rows_2 = query(profile, metrics, dims_2, filters, sort)
        if rows_1.nil? or rows_2.nil?
          return { 'error' => 'There was an error retrieving the data.' }
        end
        rows_diff = rows_1.length - rows_2.length
        if rows_diff > 0
          rows_1 = rows_1[rows_diff..-1]
        elsif rows_diff < 0
          rows_diff *= -1
          rows_2 = [rows_diff..-1]
        end
        last_pageview = Pageview.order(:time).last
        # Assumes local time zone is same as the data time zone
        now = Time.now
        (0..rows_1.length-1).each do |i|
          time = Time.new(
            now.year,
            now.month,
            now.day,
            rows_1[i][0],
            rows_1[i][1])
          if !last_pageview or time > last_pageview.time
            Pageview.create(
              time: time,
              country: rows_1[i][4],
              region: rows_1[i][5],
              city: rows_1[i][2],
              latitude: rows_1[i][6],
              longitude: rows_2[i][4],
              title: rows_2[i][5],
              uri: rows_2[i][6] + rows_1[i][3],
              count: rows_1[i][7])
          else
            break
          end
        end
        last_query ||= Timestamp.create(key: 'last_query')
        last_query.time = now
        last_query.save
      end
      results = Pageview.order(time: :desc).first(100)
      results.map! do |pageview|
        pageview.time.localtime
        pageview = [pageview.time.localtime.hour,
                    pageview.time.localtime.min,
                    pageview.country,
                    pageview.region,
                    pageview.city,
                    pageview.latitude,
                    pageview.longitude,
                    pageview.title,
                    pageview.uri,
                    pageview.count]
      end
      return { 'rows' => results }
    end

    # Query for Google Analytics data.
    def query(profile, metrics, dimensions, filters, sort)
      service = Google::Apis::AnalyticsV3::AnalyticsService.new
      scopes = ['https://www.googleapis.com/auth/analytics.readonly']
      service.authorization = Google::Auth.get_application_default(scopes)
      service.authorization.fetch_access_token!
      service.get_ga_data(profile,
                          'today',
                          'today',
                          metrics,
                          dimensions: dimensions,
                          filters: filters,
                          sort: sort) do |result, err|
        if err
          return nil
        elsif result.rows.nil?
          return []
        else
          return result.rows
        end
      end
    end

    # Merges two sets of data rows, where the first
    # n_key elements and the last n_common elements
    # are shared and should only be included once
    # in the merged rows.
    #
    # Assumes the rows are sorted and that if one
    # set has more rows than the other, the additional
    # rows are only at the beginning.
    def merge(rows, other_rows, n_key, n_common)
      size_diff = rows.length - other_rows.length
      # Drop extra rows from the larger set.
      if size_diff > 0
        rows = rows[size_diff..-1]
      elsif size_diff < 0
        other_rows = other_rows[-1*size_diff..-1]
      end
      merged_rows = []
      for i in 0..rows.length-1
        row = rows[i][0..-1*(n_common + 1)]
        row.concat(other_rows[i][n_key..-1])
        merged_rows.push(row)
      end
      return merged_rows
    end

    # Re-order elements of an array so that the
    # element at position i is moved to position
    # indices[i].
    def reorder(array, indices)
      new_array = []
      indices.each do |i|
        new_array.push(array[i])
      end
      return new_array
    end
end
