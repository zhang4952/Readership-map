class ChangeTitleTypeInReaders < ActiveRecord::Migration
  def change
    change_column :readers, :title, :text
  end
end
