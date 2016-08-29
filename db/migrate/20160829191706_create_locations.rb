class CreateLocations < ActiveRecord::Migration
  def change
    create_table :locations do |t|
      t.string :cityId
      t.string :country
      t.string :region
      t.string :city
      t.float :latitude
      t.float :longitude

      t.timestamps null: false
    end
    add_index :locations, :cityId, unique: true
  end
end
