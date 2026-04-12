#!/bin/sh
set -e

API_URL="https://api.farrel-space.online"

echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@chatbot.com", "password": "admin123"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Got token"

echo "📸 Creating Catalog Opening image..."
curl -s -X POST "$API_URL/catalog-images" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Katalog Dus Kapuk Jaya",
    "imageUrl": "https://dv0u9v99guak9.cloudfront.net/chatbot-catalog-images/Catalog+opening.png",
    "description": "Katalog lengkap dus & kardus berbagai ukuran",
    "sortOrder": 0
  }' | cat
echo ""

echo "📸 Creating Sample Sablon image..."
curl -s -X POST "$API_URL/catalog-images" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Sablon",
    "imageUrl": "https://dv0u9v99guak9.cloudfront.net/chatbot-catalog-images/Sample+sablon.png",
    "description": "Contoh hasil sablon di permukaan dus",
    "sortOrder": 1
  }' | cat
echo ""

echo "🎉 Done!"
