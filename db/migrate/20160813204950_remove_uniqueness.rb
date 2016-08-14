class RemoveUniqueness < ActiveRecord::Migration
  def change
    remove_index(:readers,
                 name: :readers_uniqueness_index)
    remove_index(:locations,
                 [:city, :latitude, :longitude])
    add_index(:locations,
              [:city, :latitude, :longitude])
  end
end
