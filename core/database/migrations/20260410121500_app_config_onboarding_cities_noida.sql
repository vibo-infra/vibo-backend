-- Replace Jaipur with Noida in onboarding catalog (existing DBs that already have the row).

UPDATE app_config
SET
  value = '{
    "cities": [
      {"name":"Mumbai","latitude":19.076,"longitude":72.8777,"state":"Maharashtra","country":"India"},
      {"name":"Delhi","latitude":28.6139,"longitude":77.209,"state":"Delhi","country":"India"},
      {"name":"Pune","latitude":18.5204,"longitude":73.8567,"state":"Maharashtra","country":"India"},
      {"name":"Bangalore","latitude":12.9716,"longitude":77.5946,"state":"Karnataka","country":"India"},
      {"name":"Hyderabad","latitude":17.385,"longitude":78.4867,"state":"Telangana","country":"India"},
      {"name":"Chennai","latitude":13.0827,"longitude":80.2707,"state":"Tamil Nadu","country":"India"},
      {"name":"Kolkata","latitude":22.5726,"longitude":88.3639,"state":"West Bengal","country":"India"},
      {"name":"Ahmedabad","latitude":23.0225,"longitude":72.5714,"state":"Gujarat","country":"India"},
      {"name":"Noida","latitude":28.5355,"longitude":77.391,"state":"Uttar Pradesh","country":"India"},
      {"name":"Goa","latitude":15.2993,"longitude":74.124,"state":"Goa","country":"India"}
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE config_key = 'onboarding_cities';
