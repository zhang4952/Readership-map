class CreateTimestamps < ActiveRecord::Migration
  def change
    create_table :timestamps do |t|
      t.string :key
      t.datetime :time

      t.timestamps null: false
    end
    
    add_index(:timestamps, :key, unique: true)
  end
end
