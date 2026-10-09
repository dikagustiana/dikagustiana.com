# The link register completed: the additions for the owner's review

Kawasan v2, phase B, task 1 (PRD v2 §3.6, §4.1, D-V2-6). Before this, 38 of the 125 placed sub-industries had no link in `docs/world/sources/links.tsv`, so no goods could leave or reach them. The 47 links below give every placed sub-industry at least one supplier or customer. Every link is `expected`, carries a one-line `note` (shown in the cards) and a `goods` class (which vehicle runs it, PRD v2 Appendix A); a published package still overrides a link at runtime.

Every one of the 126 earlier links now carries a `goods` class too, set from its note: 18 bulk, 11 liquid, 6 cold, 78 boxed, 9 parcel, 7 people, 44 none across all 173 (a `none` link draws no vehicle: money, services and information move as coins and pulses).

These are the agent's proposals. To change one, edit `links.tsv` and run `npm run build:registry`.

| From | To | Goods | Note (in the cards) | Why this link |
|---|---|---|---|---|
| A211 Alternative Energy Equipment | J411 Electric Utilities | boxed | solar panels and power equipment for generation | Alternative energy equipment (solar panels, inverters) is sold to power generators; the estate's power plant is its customer. |
| B145 Precious Metals & Minerals | C211 Diversified Industrial Trading | boxed | precious metals and minerals sold through industrial traders | Precious metals and minerals leave the mine as traded commodities; the gateway's industrial traders are the nearest buyer the world places. |
| B141 Aluminium | C111 Aerospace & Defense | boxed | aluminium for aircraft parts | Aircraft structures are aluminium; it gives Aerospace & Defense a supplier. |
| C111 Aerospace & Defense | K111 Airlines | boxed | aircraft parts and maintenance materials for airlines | Airlines buy parts and maintenance materials; it gives Aerospace & Defense a customer. |
| B152 Paper | C221 Commercial Printing | boxed | paper for commercial printing | Commercial printers print on paper and board. |
| C221 Commercial Printing | B131 Containers & Packaging | boxed | printed labels and cartons for packaging | Printed labels and folding cartons go into packaging. |
| B152 Paper | C223 Office Supplies | boxed | paper for office supplies | Office paper and stationery start as paper. |
| C223 Office Supplies | C224 Business Support Services | parcel | office supplies for business services | Business services consume office supplies. |
| C224 Business Support Services | G111 Banks | people | business support services for banks | Banks are the largest buyers of outsourced document and business services the world places. |
| C231 Human Resource & Employment Services | E711 Consumer Distributors | people | outsourced staff for distributors | Distributors staff their depots through outsourcing firms. |
| C231 Human Resource & Employment Services | D113 Supermarkets & Convenience Stores | people | outsourced staff for supermarkets | Supermarkets staff their stores through outsourcing firms. |
| C232 Research & Consulting Services | A121 Coal Production | people | inspection and testing of coal shipments | Inspection and testing firms certify coal cargoes (the registry's Carsurin does exactly this). |
| C311 Multi-sector Holdings | H111 Real Estate Development & Management | none | holding groups that own estate developers | Multi-sector holdings own estate developers; a capital link, drawn with no vehicle. |
| B144 Iron & Steel | E213 Housewares & Specialties | boxed | steel for kitchenware | Kitchenware is pressed from steel sheet. |
| E213 Housewares & Specialties | E743 Home Improvement Retail | boxed | housewares to home-improvement retail | Housewares are sold through home-improvement stores. |
| E711 Consumer Distributors | E511 Gaming Venues | parcel | food and drinks for gaming venues | Gaming venues stock food and drinks from consumer distributors. |
| D112 Food Retail & Distributors | E512 Hotels, Resorts & Cruise Lines | cold | food supplies for hotels | Hotels buy food from food distributors. |
| E513 Travel Agencies | E512 Hotels, Resorts & Cruise Lines | people | travellers booked into hotels by travel agents | Travel agents book travellers into hotels: people, carried by bus. |
| K111 Airlines | E513 Travel Agencies | none | airline seats sold through travel agents | Travel agents sell airline seats; a service link, no vehicle. |
| E321 Sport Equipment & Hobbies Goods | E514 Recreational & Sports Facilities | boxed | sport equipment for recreation facilities | Recreation and sports facilities buy sport equipment. |
| D231 Fish, Meat & Poultry | E515 Restaurants | cold | meat, poultry and fish for restaurants | Restaurants buy meat, poultry and fish. |
| D112 Food Retail & Distributors | E515 Restaurants | cold | food supplies for restaurants | Restaurants buy from food distributors. |
| C223 Office Supplies | E521 Education Services | parcel | office and school supplies for schools | Schools buy office and school supplies. |
| D411 Household Products | E522 Consumer Support Services | parcel | household products for consumer services | Consumer services (laundries and the like) use household products. |
| E611 Advertising | E612 Broadcasting | none | advertising airtime bought from broadcasters | Advertisers buy airtime from broadcasters; no vehicle. |
| E612 Broadcasting | E613 Cable & Satellite | none | channels carried on pay television | Pay television carries the broadcasters' channels; no vehicle. |
| E621 Entertainment & Movie Production | E612 Broadcasting | none | programmes produced for broadcasters | Producers sell programmes to broadcasters; no vehicle. |
| E621 Entertainment & Movie Production | E514 Recreational & Sports Facilities | none | films shown in recreation venues | Films are shown in recreation venues; no vehicle. |
| F221 Healthcare Research | F211 Pharmaceuticals | none | research for pharmaceutical makers | Healthcare research serves the pharmaceutical makers; no vehicle. |
| G221 Venture Capital | I111 Online Applications & Services | none | venture capital for internet platforms | Venture capital funds internet platforms; no vehicle. |
| G222 Specialized Business Financing | K132 Road Transportation | none | equipment financing for transport fleets | Specialised lenders finance trucks and equipment for transport fleets; no vehicle. |
| G311 Investment Management | G313 Market Operators | none | fund managers trading on the exchange | Fund managers trade on the exchange; no vehicle. |
| G312 Investment Banking & Brokerage Services | G313 Market Operators | none | brokers trading on the exchange | Brokers trade on the exchange; no vehicle. |
| G314 Investment Service Support | G312 Investment Banking & Brokerage Services | none | custody and settlement for brokers | Custody and settlement serve the brokers; no vehicle. |
| G411 Insurance Brokers | G412 General Insurance | none | brokers placing risks with general insurers | Insurance brokers place risks with general insurers; no vehicle. |
| G413 Life Insurance | G311 Investment Management | none | life insurers investing through fund managers | Life insurers invest their reserves through fund managers; no vehicle. |
| G414 Reinsurance | G412 General Insurance | none | reinsurance for general insurers | Reinsurers take risk from general insurers; no vehicle. |
| G511 Financial Holdings | G111 Banks | none | holding companies that own banks | Financial holdings own banks; no vehicle. |
| G512 Investment Companies | D113 Supermarkets & Convenience Stores | none | investment companies that own retail chains | Investment companies own retail chains (the registry's Indoritel holds one); no vehicle. |
| H112 Real Estate Services | H111 Real Estate Development & Management | people | property services for estate developers | Property services manage and market what estate developers build: people, carried by bus. |
| I232 Electronic Components & Semiconductors | I231 Electronic Equipment & Instruments | boxed | electronic components into instruments | Electronic instruments are built from electronic components. |
| I231 Electronic Equipment & Instruments | F111 Healthcare Equipment | boxed | instruments for healthcare equipment | Healthcare equipment carries electronic instruments. |
| J111 Airport Operators | K111 Airlines | none | airport services for airlines | Airport operators serve airlines; no vehicle. |
| J312 Integrated Telecommunication Service | I111 Online Applications & Services | none | network capacity for internet applications | Integrated telecom carries internet applications; no vehicle. |
| J312 Integrated Telecommunication Service | G111 Banks | none | telecommunication services for banks | Banks buy network and data services; no vehicle. |
| J431 Water Utilities | D212 Soft Drinks | liquid | water for soft drinks and bottled water | Soft drinks and bottled water start as treated water, by tanker in the world. |
| K121 Passenger Marine Transportation | E512 Hotels, Resorts & Cruise Lines | people | ferry passengers to hotels and resorts | Ferries bring travellers to hotels and resorts: people, carried by bus. |
