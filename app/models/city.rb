class City < ActiveRecord::Base
  validates :city, uniqueness: { scope: [:latitude, :longitude] }

end
