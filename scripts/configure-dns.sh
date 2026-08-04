#!/bin/bash
# NexaStream DNS Configuration Script
# Configure DNS for nexastream.org

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🌐 NexaStream DNS Configuration                         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check for Cloudflare API token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  Cloudflare API token not found"
    echo "   Set CLOUDFLARE_API_TOKEN environment variable"
    echo ""
fi

# Domain configuration
DOMAIN="nexastream.org"
FRONTEND_URL="nexastream.org"
API_URL="api.nexastream.org"
EXPLORER_URL="explorer.nexastream.org"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Frontend: https://$FRONTEND_URL"
echo "   API: https://$API_URL"
echo "   Explorer: https://$EXPLORER_URL"
echo ""

# Option 1: Cloudflare Configuration
configure_cloudflare() {
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        echo "❌ Cloudflare API token required"
        return 1
    fi

    echo "🔧 Configuring Cloudflare DNS..."
    
    # Get zone ID
    ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" | jq -r '.result[0].id')

    if [ "$ZONE_ID" == "null" ]; then
        echo "❌ Domain not found in Cloudflare"
        return 1
    fi

    echo "   Zone ID: $ZONE_ID"

    # Add A record for root domain
    echo "   Adding A record for @ -> Vercel..."
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "{
            \"type\": \"A\",
            \"name\": \"$DOMAIN\",
            \"content\": \"76.76.21.21\",
            \"ttl\": 3600,
            \"proxied\": false
        }"

    # Add CNAME for www
    echo "   Adding CNAME for www -> Vercel..."
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "{
            \"type\": \"CNAME\",
            \"name\": \"www\",
            \"content\": \"cname.vercel-dns.com\",
            \"ttl\": 3600,
            \"proxied\": true
        }"

    # Add CNAME for api (after Railway deployment)
    echo "   Adding CNAME for api (configure after Railway deploy)..."
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "{
            \"type\": \"CNAME\",
            \"name\": \"api\",
            \"content\": \"nexastream-api.railway.app\",
            \"ttl\": 3600,
            \"proxied\": false
        }"

    # Add CNAME for explorer (configure after node deployment)
    echo "   Adding CNAME for explorer (configure after NexaChain deploy)..."
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "{
            \"type\": \"CNAME\",
            \"name\": \"explorer\",
            \"content\": \"nexachain-node.railway.app\",
            \"ttl\": 3600,
            \"proxied\": false
        }"

    echo "✅ Cloudflare DNS configured"
}

# Option 2: GoDaddy Configuration
configure_godaddy() {
    echo "⚠️  GoDaddy DNS Configuration Required"
    echo ""
    echo "Please add the following DNS records in your GoDaddy account:"
    echo ""
    echo "┌─────────────────────────────────────────────────────────┐"
    echo "│ DNS Records to Add                                      │"
    echo "├─────────────────────────────────────────────────────────┤"
    echo "│                                                         │"
    echo "│ Type     │ Name  │ Value                     │ TTL      │"
    echo "│──────────│───────│──────────────────────────│──────────│"
    echo "│ A        │ @     │ 76.76.21.21              │ 1 Hour   │"
    echo "│ CNAME    │ www   │ cname.vercel-dns.com     │ 1 Hour   │"
    echo "│ CNAME    │ api   │ nexastream-api.railway.app │ 1 Hour │"
    echo "│ CNAME    │ explorer │ nexachain-node.railway.app │ 1 Hour │"
    echo "│                                                         │"
    echo "└─────────────────────────────────────────────────────────┘"
    echo ""
    echo "Steps:"
    echo "1. Go to https://dns.godaddy.com"
    echo "2. Select $DOMAIN"
    echo "3. Click 'Add' for each record above"
    echo "4. Wait 5-30 minutes for propagation"
}

# Option 3: Generate manual instructions
generate_instructions() {
    echo "📝 Manual DNS Configuration Instructions"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "OPTION A: Cloudflare (Recommended)"
    echo "───────────────────────────────────────────────────────────"
    echo "1. Go to https://dash.cloudflare.com"
    echo "2. Add site: $DOMAIN"
    echo "3. Update nameservers at your registrar"
    echo "4. Add records:"
    echo ""
    echo "   Type: A"
    echo "   Name: @"
    echo "   Content: 76.76.21.21"
    echo "   Proxy: DNS Only"
    echo ""
    echo "   Type: CNAME"
    echo "   Name: www"
    echo "   Content: cname.vercel-dns.com"
    echo "   Proxy: DNS Only"
    echo ""
    echo "   Type: CNAME"
    echo "   Name: api"
    echo "   Content: nexastream-api.railway.app"
    echo "   Proxy: DNS Only"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "OPTION B: GoDaddy"
    echo "───────────────────────────────────────────────────────────"
    echo "1. Go to https://dns.godaddy.com"
    echo "2. Select $DOMAIN"
    echo "3. Add records:"
    echo ""
    echo "   Type: A"
    echo "   Name: @"
    echo "   Value: 76.76.21.21"
    echo "   TTL: 1 Hour"
    echo ""
    echo "   Type: CNAME"
    echo "   Name: www"
    echo "   Value: cname.vercel-dns.com"
    echo "   TTL: 1 Hour"
    echo ""
    echo "   Type: CNAME"
    echo "   Name: api"
    echo "   Value: nexastream-api.railway.app"
    echo "   TTL: 1 Hour"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
}

# SSL Configuration
configure_ssl() {
    echo ""
    echo "🔐 SSL/HTTPS Configuration"
    echo ""
    echo "Cloudflare SSL Settings:"
    echo "1. SSL/TLS → Overview"
    echo "2. Set mode to: 'Full' or 'Full (strict)'"
    echo ""
    echo "This will enable HTTPS for all subdomains."
}

# DNS Propagation Check
check_dns() {
    echo ""
    echo "🔍 DNS Propagation Check"
    echo ""
    echo "Checking $DOMAIN..."
    
    # Check A record
    A_RECORD=$(dig +short A $DOMAIN @8.8.8.8 2>/dev/null || echo "Not propagated")
    echo "   A record: $A_RECORD"
    
    # Check CNAME for www
    WWW_CNAME=$(dig +short CNAME www.$DOMAIN @8.8.8.8 2>/dev/null || echo "Not propagated")
    echo "   WWW CNAME: $WWW_CNAME"
    
    echo ""
    echo "Check propagation at: https://dnschecker.org/#A/$DOMAIN"
}

# Main menu
echo "Select configuration method:"
echo ""
echo "1) Configure Cloudflare (requires API token)"
echo "2) Show GoDaddy instructions"
echo "3) Generate manual instructions"
echo "4) Check DNS propagation"
echo "5) Show SSL configuration"
echo ""
read -p "Enter option [1-5]: " option

case $option in
    1) configure_cloudflare ;;
    2) configure_godaddy ;;
    3) generate_instructions ;;
    4) check_dns ;;
    5) configure_ssl ;;
    *) echo "Invalid option" ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ DNS Configuration Complete!"
echo ""
echo "Next steps:"
echo "1. Wait for DNS propagation (5-30 minutes)"
echo "2. Verify SSL certificate"
echo "3. Deploy frontend to Vercel"
echo "4. Deploy backend to Railway"
echo "5. Deploy NexaChain node"
echo "═══════════════════════════════════════════════════════════"
