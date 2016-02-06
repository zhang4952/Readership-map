class CreatePageviews < ActiveRecord::Migration
  def change
    create_table :pageviews do |t|
      t.datetime :time
      t.string :host
      t.string :path
      t.string :city
      t.string :region
      t.string :country
      t.float :latitude
      t.float :longitude
      t.string :title
      t.string :language
      t.integer :count

      t.timestamps null: false
    end
    add_index :pageviews, :time
    add_index :pageviews, [:time, :host, :path, :city], unique: true
  end
end
