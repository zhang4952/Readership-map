class SimplifyReader < ActiveRecord::Migration
  def change
    remove_columns(:readers,
                   :country, :region, :host, :language)
    remove_index(:readers,
                 [:time, :host, :path, :city, :activity])
    add_index(:readers,
              [:time, :latitude, :longitude, :path, :activity],
              unique: true,
              name: 'readers_uniqueness_index')
  end
end
