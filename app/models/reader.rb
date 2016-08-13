class Reader < ActiveRecord::Base
  validates :time, uniqueness: {
    scope: [:latitude, :longitude, :path, :activity] }

end
