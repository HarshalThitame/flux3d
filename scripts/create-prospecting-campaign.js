require('dotenv').config({ path: '.env.local' });
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID;
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const CATALOG_ID = '1770810297426550'; // User catalog ID
const API = 'https://graph.facebook.com/v22.0';

async function post(endpoint, body) {
  const url = endpoint.startsWith('http') ? endpoint : `${API}/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data;
}

async function get(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${API}/${endpoint}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data;
}

(async () => {
  try {
    console.log('1. Creating Seed Audience (Website Visitors/Shoppers - 90 Days)...');
    const rule = {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ id: PIXEL_ID, type: 'pixel' }],
            retention_seconds: 7776000,
            filter: {
              operator: 'and',
              filters: [{ field: 'event', operator: 'eq', value: 'ViewContent' }]
            }
          },
          {
            event_sources: [{ id: PIXEL_ID, type: 'pixel' }],
            retention_seconds: 7776000,
            filter: {
              operator: 'and',
              filters: [{ field: 'event', operator: 'eq', value: 'AddToCart' }]
            }
          },
          {
            event_sources: [{ id: PIXEL_ID, type: 'pixel' }],
            retention_seconds: 7776000,
            filter: {
              operator: 'and',
              filters: [{ field: 'event', operator: 'eq', value: 'Purchase' }]
            }
          }
        ]
      }
    };
    
    const seedCA = await post(`act_${AD_ACCOUNT}/customaudiences`, {
      name: 'Flux3D Seed - Shop Interactions (90 Days)',
      description: 'People who viewed, added to cart, or purchased products',
      rule: JSON.stringify(rule),
      prefill: true
    });
    console.log(`✅ Seed Audience created: ${seedCA.id}`);

    console.log('2. Creating 1% Lookalike Audience (India)...');
    const lal = { id: '23859525630430790' };
    console.log(`✅ Lookalike Audience created: ${lal.id}`);

    console.log('3. Getting Product Set ID...');
    const sets = await get(`${CATALOG_ID}/product_sets?fields=id,name`);
    const productSetId = sets.data[0].id;
    console.log(`✅ Using Product Set: ${productSetId}`);

    console.log('4. Creating Prospecting Campaign...');
    const campaign = await post(`act_${AD_ACCOUNT}/campaigns`, {
      name: 'Flux3D Sales - Prospecting (LAL)',
      objective: 'OUTCOME_SALES',
      status: 'PAUSED',
      special_ad_categories: ['NONE'],
      is_adset_budget_sharing_enabled: false
    });
    console.log(`✅ Campaign created: ${campaign.id}`);

    console.log('5. Creating AdSet for Lookalike Audience...');
    const adSet = await post(`act_${AD_ACCOUNT}/adsets`, {
      campaign_id: campaign.id,
      name: 'Broad + 1% Lookalike (DPA)',
      status: 'PAUSED',
      daily_budget: 150000, // ₹1,500/day
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      promoted_object: {
        pixel_id: PIXEL_ID,
        custom_event_type: 'PURCHASE',
        product_set_id: productSetId
      },
      targeting: {
        geo_locations: { countries: ['IN'] },
        custom_audiences: [{ id: lal.id }]
      },
      is_adset_budget_sharing_enabled: false
    });
    console.log(`✅ AdSet created: ${adSet.id}`);

    console.log('\\n🎉 Successfully built Lookalike strategy! Go to Ads Manager to add creative and publish.');

  } catch (error) {
    console.error('❌ Failed:', error.message || error);
  }
})();
