# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20160808225624) do

  create_table "cities", force: :cascade do |t|
    t.string   "city"
    t.float    "latitude"
    t.float    "longitude"
    t.string   "region"
    t.string   "country"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_index "cities", ["city", "latitude", "longitude"], name: "index_cities_on_city_and_latitude_and_longitude", unique: true

  create_table "readers", force: :cascade do |t|
    t.datetime "time"
    t.string   "city"
    t.float    "latitude"
    t.float    "longitude"
    t.string   "title"
    t.string   "path"
    t.string   "activity"
    t.integer  "count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_index "readers", ["time", "latitude", "longitude", "path", "activity"], name: "readers_uniqueness_index", unique: true
  add_index "readers", ["time"], name: "index_readers_on_time"

  create_table "timestamps", force: :cascade do |t|
    t.string   "key"
    t.datetime "time"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_index "timestamps", ["key"], name: "index_timestamps_on_key", unique: true

end
