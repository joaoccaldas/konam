# Affiliate and Vendor Revenue Strategy V0

## Principle

Every canonical product, component, place or event may have zero or more `CommerceOffer` objects.

The product experience remains useful without monetization. Revenue is attached only where a verified provider/program exists.

## Safe priority order

1. Direct manufacturer affiliate program.
2. Official authorized-dealer locator or retailer.
3. Approved travel/activity affiliate program.
4. Sponsor/partner direct agreement.
5. Ordinary non-affiliate link when no commercial agreement exists.

Do not route users to unknown marketplaces merely because commission is available.

## Current high-confidence programs

### Canyon
Official affiliate program exists. Canyon states a 2% base commission on bikes, higher opportunities for some products/partners, and a 30-day cookie window.

### Specialized
Official affiliate program exists through Rakuten. Specialized publishes 3%-12% commission on bikes/equipment and a 30-day cookie window.

### Nike
Nike's Sweden/EU affiliate programme uses CJ and publishes up to 11% commission on valid sales with a 30-day cookie period.

### Booking.com
Official affiliate programme supports accommodations plus transport/attractions and pays commission on qualified bookings through official affiliate networks.

### KAYAK
Affiliate network supports deep links, widgets, white-label and APIs across flights/hotels/cars/packages.

### Viator
Official partner program supports links/widgets/APIs. Viator states 8% commission on completed experience bookings within a 30-day attribution window.

## Component vendors

For DT Swiss and Shimano, official dealer locators are safer than inventing retailer associations:
- DT Swiss explicitly sells through official dealers.
- Shimano exposes official dealer/stock locators.

If a retailer affiliate agreement is later approved, add it as a separate offer linked to the same component.

## Conversion path

```
PRODUCT / PART / PLACE
        ↓
inspect / explode / understand
        ↓
"Where to buy" or "Book"
        ↓
CommerceOffer
        ↓
approved vendor/provider
        ↓
outbound click
        ↓
provider-reported conversion later
```

## Data model

Offers should include:
- offer ID;
- provider;
- product/place/event IDs;
- market;
- offer status;
- destination URL;
- tracking method;
- disclosure;
- validity window.

Never store private affiliate credentials in the public repo.

## UX

Good:
- "Buy from Canyon"
- "Find an official DT Swiss dealer"
- "Book accommodation"
- "Explore Kona experiences"

Bad:
- generic ad banners;
- hidden affiliate redirects;
- ranking products by commission;
- stale price/availability claims.

## Day-1 tracking

Without an account, conversion events can remain contextual:
- offer impression;
- offer opened;
- outbound click.

No user identifier is required.

## Next commercial experiments

1. Apply to Canyon, Specialized and Nike affiliate programs.
2. Apply to Booking.com and/or KAYAK for travel monetization.
3. Apply to Viator for destination activities.
4. Add local-retailer/vendor offers only after verifying official/authorized status and terms.
5. Measure outbound conversion by product/event/surface, not by invasive user profiling.
