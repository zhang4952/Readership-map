class CreateReaders < ActiveRecord::Migration
  def change
    create_table :readers do |t|
      t.datetime :time
      t.string :country
      t.string :region
      t.string :city
      t.float :latitude
      t.float :longitude
      t.text :title
      t.string :uri
      t.string :activity
      t.integer :count

      t.timestamps null: false
    end
    
    add_index(:readers, :time)
  end
end
