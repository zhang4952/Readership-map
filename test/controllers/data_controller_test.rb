require 'test_helper'

class DataControllerTest < ActionController::TestCase
  test "should get pageviews" do
    get :pageviews
    assert_response :success
  end

end
