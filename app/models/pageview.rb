class Pageview < ActiveRecord::Base
  validates :time, uniqueness: { scope: [:city, :uri] }
end
