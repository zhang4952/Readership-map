class CreatePageviews < ActiveRecord::Migration
  def change
    create_table :pageviews do |t|
      t.datetime :time
      t.string :country
      t.string :region
      t.string :city
      t.float :latitude
      t.float :longitude
      t.string :title
      t.string :uri
      t.integer :count

      t.timestamps null: false
    end
    add_index :pageviews, :time
    add_index :pageviews, [:time, :city, :uri], unique: true
  end
end
