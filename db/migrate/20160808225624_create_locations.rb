class CreateLocations < ActiveRecord::Migration
  def change
    create_table :locations do |t|
      t.string :city
      t.float :latitude
      t.float :longitude
      t.string :region
      t.string :country

      t.timestamps null: false
    end
    add_index :locations, [:city, :latitude, :longitude], unique: true
  end
end
