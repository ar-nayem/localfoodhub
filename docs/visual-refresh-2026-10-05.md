# Customer and operations visual refresh

Updated Explore, shop identity, cart, checkout and profile surfaces, plus shared vendor/admin navigation and admin overview. Existing ordering, payment and authorization logic retained.

Verification: 54 automated tests passed; production build and type checking passed; git diff whitespace check passed. Browser screenshots inspected locally for Explore, vendor overview and admin overview using a disposable seeded database. Earlier local shop inspection identified and corrected empty delivery-mode columns. Valid merchant uploads remain preferred; two known unrelated sample uploads use food artwork instead. Generic shop fallback images are labeled illustrative.

Limits: no live order or payment submitted; full authenticated customer checkout and device-by-device visual regression remain unverified. This deployment updates the shared website, not Play Store submissions.
