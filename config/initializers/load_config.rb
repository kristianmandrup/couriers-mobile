APP_CONFIG = YAML.load_file("#{Rails.root.to_s}/config/config.yml")[Rails.env]

RestClient.log = Logger.new(STDOUT)