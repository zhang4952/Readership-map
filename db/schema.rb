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

ActiveRecord::Schema.define(version: 20160320012351) do

  create_table "pageviews", force: :cascade do |t|
    t.datetime "time"
    t.string   "host"
    t.string   "path"
    t.string   "city"
    t.string   "region"
    t.string   "country"
    t.float    "latitude"
    t.float    "longitude"
    t.string   "title"
    t.string   "language"
    t.integer  "count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_index "pageviews", ["time", "host", "path", "city"], name: "index_pageviews_on_time_and_host_and_path_and_city", unique: true
  add_index "pageviews", ["time"], name: "index_pageviews_on_time"

  create_table "readers", force: :cascade do |t|
    t.datetime "time"
    t.string   "country"
    t.string   "region"
    t.string   "city"
    t.float    "latitude"
    t.float    "longitude"
    t.string   "host"
    t.string   "path"
    t.string   "title"
    t.string   "language"
    t.string   "activity"
    t.integer  "count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_index "readers", ["time", "host", "path", "city", "activity"], name: "index_readers_on_time_and_host_and_path_and_city_and_activity", unique: true
  add_index "readers", ["time"], name: "index_readers_on_time"

  create_table "timestamps", force: :cascade do |t|
    t.string   "key"
    t.datetime "time"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_index "timestamps", ["key"], name: "index_timestamps_on_key", unique: true

end
