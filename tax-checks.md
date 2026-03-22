# Tax Opportunity Checks

Each check follows the format:
- **IF**: condition derived from the extracted tax return data
- **THEN**: the question to verify

Add new checks by appending to the appropriate section. The LLM evaluates each check against the extracted data and returns pass / fail / na / info.

> Note on OBBBA provisions: Several federal checks below are based on the One Big Beautiful Bill Act (OBBBA), signed into law July 4, 2025 (Public Law 119-21). These are marked with `[OBBBA]`. Apply the following rule for all `[OBBBA]` checks:
> - If `taxYear < 2025`: mark **na** automatically — OBBBA cannot apply.
> - If `taxYear >= 2025`: OBBBA is enacted law — apply these checks unconditionally. Do not mark **na** due to enactment uncertainty.

---

## Federal — Transactions

These checks apply when a one-time transaction occurred during the tax year. Evaluate based on `income.capitalGainsOrLoss`, `notes`, and any user-provided documents (closing statements, settlement sheets, etc.).

### Primary Residence Sale — Section 121 Exclusion
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: notes or user-provided documents indicate a primary residence was sold during the year
- **THEN**: Did you apply the Section 121 exclusion to exclude up to $250,000 ($500,000 MFJ) of gain from the sale of a primary residence?
- **Rule**: Under IRC §121, a taxpayer may exclude up to $250,000 (single) or $500,000 (MFJ) of capital gain from the sale of a home that was their primary residence for at least 2 of the 5 years preceding the sale. Key issues to verify: (1) ownership and use tests met — 2 of last 5 years as primary residence; (2) exclusion not used within the prior 2 years; (3) if the taxpayer used part of the home for business or rental, the business-use portion of gain may not be excludable; (4) any unrecaptured Section 1250 gain (depreciation recapture from prior rental use) is taxed at up to 25% even if the rest of the gain is excluded; (5) if the gain exceeds the exclusion, the excess is reported on Schedule D. If a home sale is indicated but the exclusion appears absent or incorrect, mark **possible_overpayment**.

### Inherited Property — Stepped-Up Basis (IRC §1014)
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: notes or user-provided documents indicate an inherited asset was sold during the year
- **THEN**: Was the cost basis of the inherited property stepped up to fair market value as of the date of death (or alternate valuation date)?
- **Rule**: Under IRC §1014, assets inherited from a decedent receive a stepped-up (or stepped-down) basis equal to the fair market value on the date of death. This eliminates all pre-death appreciation from taxable gain. A taxpayer who uses the original purchase price instead of the stepped-up FMV will dramatically overstate their taxable gain. If inherited property is sold and the cost basis appears to be the original purchase price rather than FMV at inheritance, mark **possible_overpayment**.

### Like-Kind Exchange — Section 1031
<!-- meta: state=ALL -->
- **IF**: notes or user-provided documents indicate a real estate or business property was exchanged for a similar property
- **THEN**: Was a Section 1031 like-kind exchange properly structured and reported on Form 8824?
- **Rule**: Under IRC §1031, gain from the exchange of real property held for investment or business use may be deferred if replaced with like-kind property within 180 days (45-day identification period). Key issues: (1) both relinquished and replacement property must be real property held for investment or business — personal residences and inventory do not qualify; (2) any boot (cash or non-like-kind property received) is taxable; (3) must be reported on Form 8824; (4) §1031 exchanges no longer apply to personal property after 2017. If a property exchange occurred but no Form 8824 is present, mark **needs_more_info**.

### Installment Sale — Section 453 Election
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: notes or user-provided documents indicate a property or business was sold with seller financing or payments received over multiple years
- **THEN**: Was the installment sale method (§453) considered and properly elected or opted out of?
- **Rule**: Under IRC §453, gain from a sale where at least one payment is received after the tax year of sale is reported proportionally as payments are received (installment method). This can defer gain into future years. Alternatively, the taxpayer may elect out of §453 and report all gain in the year of sale. If an installment sale occurred, verify: (1) Form 6252 is included; (2) the gross profit percentage and contract price are correct; (3) if the taxpayer opted out, verify the election was intentional. Dealers in property and sales of publicly traded securities cannot use §453.

### Divorce or Separation — Property Transfer (IRC §1041)
<!-- meta: state=ALL filing=NOT:MFJ -->
- **IF**: notes indicate a divorce, legal separation, or transfer of property to a former spouse during the year
- **THEN**: Were property transfers incident to divorce treated as non-taxable under IRC §1041?
- **Rule**: Under IRC §1041, transfers of property between spouses or to a former spouse incident to divorce are not taxable — no gain or loss is recognized. The recipient takes a carryover basis. Issues to watch: (1) the transfer must be incident to divorce (within 1 year of divorce, or within 6 years if pursuant to a divorce instrument); (2) the carryover basis rule means the recipient may face a large taxable gain when they later sell; (3) transfers of property subject to liabilities in excess of basis may generate gain; (4) retirement account transfers must use a QDRO to avoid tax and penalties. If a property transfer to a spouse/ex-spouse appears to have been treated as a taxable sale, mark **possible_overpayment**.

---

## Federal — Capital Gains & Equity Compensation

These checks apply when the taxpayer has capital gains, stock sales, or equity compensation (RSUs, ESPPs, stock options). Evaluate based on `income.capitalGainsOrLoss`, `notes`, Schedule D, Form 8949, and any user-provided brokerage or employer equity documents.

### Short-Term vs Long-Term Capital Gains Rate
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: `income.capitalGainsOrLoss > 0`
- **THEN**: Are all capital gains correctly classified as short-term (held ≤1 year, taxed at ordinary rates) or long-term (held >1 year, taxed at 0%/15%/20%)?
- **Rule**: The holding period determines the rate. Long-term rates for 2025: 0% (MFJ taxable income ≤$96,700), 15% (≤$583,750), 20% (above). Short-term gains are taxed as ordinary income. Misclassifying long-term gains as short-term results in overpayment; misclassifying short-term as long-term results in underpayment. Verify Form 8949 Part I (short-term) and Part II (long-term) totals match Schedule D. If the taxpayer has gains that appear to be taxed at ordinary rates when the holding period may exceed one year, mark **possible_overpayment**.

### Wash Sale Rule — Disallowed Loss Added to Basis
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: `income.capitalGainsOrLoss` is present AND notes or 1099-B indicate wash sale disallowances
- **THEN**: Are wash sale disallowed losses correctly disallowed on Form 8949 (Box 1g) AND added to the cost basis of the replacement shares?
- **Rule**: Under IRC §1091, a loss is disallowed if substantially identical securities are purchased within 30 days before or after the sale. The disallowed loss is added to the basis of the replacement shares. Two common errors: (1) the disallowed loss is claimed as a deduction (underpayment); (2) the adjusted basis of replacement shares does not reflect the disallowed amount, causing overpayment when those shares are later sold. Verify Box 1g (wash sale loss disallowed) on 1099-B flows correctly to Form 8949 and is not deducted.

### Net Investment Income Tax (NIIT) — IRC §1411
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: `income.capitalGainsOrLoss > 0` OR `income.ordinaryDividends > 0` OR `income.rentalIncome > 0`
- **THEN**: Was the 3.8% Net Investment Income Tax correctly computed on Form 8960?
- **Rule**: A 3.8% surtax applies to the lesser of (a) net investment income or (b) the amount by which MAGI exceeds $200,000 (single) / $250,000 (MFJ). Net investment income includes: capital gains, dividends, interest, rental income (unless from active real estate), and passive income. Does not include wages, active business income, or distributions from qualified retirement plans. If MAGI exceeds the threshold and NII is present but `tax.netInvestmentIncomeTax = 0`, mark **possible_underpayment**.

### RSU — Ordinary Income and Withholding Reconciliation
<!-- meta: state=ALL -->
- **IF**: notes or W-2 or employer equity documents indicate RSU (Restricted Stock Unit) vesting occurred during the year
- **THEN**: Is the RSU ordinary income correctly included in W-2 Box 1 wages, and is the cost basis of any shares sold equal to the fair market value at vesting (not $0)?
- **Rule**: RSU income is taxable as ordinary compensation at vesting. The FMV of shares on the vest date is included in W-2 Box 1 as wages — this is typically already withheld by the employer. Common errors: (1) **double-counting** — the W-2 income from vesting is also reported as a capital gain on 1099-B if the broker uses $0 cost basis; taxpayer should report the vest FMV as the cost basis on Form 8949, not $0; (2) **basis not adjusted** — broker 1099-B may show $0 cost basis or "cost basis not reported to IRS" — taxpayer must manually enter the correct basis (vest date FMV × shares sold); (3) supplemental withholding at 22% flat rate may be insufficient for high earners — verify total tax liability. If 1099-B shows large gains on RSU shares that were included in W-2 wages, the basis may be wrong — mark **possible_overpayment**.

### ESPP — Ordinary Income Component and Basis Adjustment
<!-- meta: state=ALL -->
- **IF**: notes or Form 3922 or employer documents indicate an Employee Stock Purchase Plan (ESPP) sale occurred
- **THEN**: Is the ESPP ordinary income (the discount element) correctly reported as wages, and is the cost basis on Form 8949 properly adjusted to avoid double-taxation?
- **Rule**: ESPP sales have two components: (1) the discount portion (ordinary income, included in W-2 Box 1 for qualifying dispositions, or reported separately for disqualifying dispositions); (2) any additional appreciation (capital gain/loss). The IRS requires that the ordinary income already reported in wages be added to the purchase price to compute the correct adjusted basis on Form 8949 — if the broker uses the actual purchase price as basis without the W-2 income adjustment, the taxpayer will pay tax twice on the ordinary income component. Form 3922 provides purchase date, purchase price, and FMV on purchase/transfer dates. Verify: (a) the ordinary income amount matches between W-2 and Form 3922; (b) the adjusted basis on Form 8949 includes the ordinary income component; (c) qualifying vs disqualifying disposition rules are correctly applied (holding period: 2 years from offering date AND 1 year from purchase date for qualifying).

### ISO — Alternative Minimum Tax (AMT) on Exercise
<!-- meta: state=ALL -->
- **IF**: notes or Form 3921 indicate Incentive Stock Options (ISOs) were exercised during the year
- **THEN**: Was the ISO spread (FMV at exercise minus exercise price) included as an AMT adjustment on Form 6251?
- **Rule**: Exercising ISOs does not trigger regular income tax, but the spread (bargain element) is an AMT preference item that increases AMTI on Form 6251. If the taxpayer exercises ISOs and holds the shares (does not immediately sell), the spread must be added to AMTI even though no regular tax is owed. Common errors: (1) AMT not computed at all after ISO exercise; (2) AMT credit (Form 8801) from prior-year ISO AMT not carried forward; (3) if shares were sold in the same year as exercise (disqualifying disposition), the spread is ordinary income and does NOT trigger AMT — verify the correct treatment. If Form 3921 indicates ISO exercises but Form 6251 is absent or shows no ISO adjustment, mark **possible_underpayment**.

### NSO — Ordinary Income at Exercise
<!-- meta: state=ALL -->
- **IF**: notes or employer documents indicate Non-Qualified Stock Options (NSOs or NQSOs) were exercised during the year
- **THEN**: Is the NSO spread (FMV at exercise minus exercise price) correctly reported as ordinary compensation income in W-2 Box 1?
- **Rule**: The spread on NSO exercise is ordinary income, subject to income tax and employment taxes (FICA). It should appear in W-2 Box 1 (and Box 12, Code V for amounts over $1,000,000 for 162(m) limitation purposes). The cost basis for the acquired shares on Form 8949 should equal FMV at exercise (the exercise price plus the spread included in income). If NSO exercise is indicated but no corresponding W-2 income or Form 8949 basis adjustment is present, mark **possible_underpayment**.

### Capital Loss Carryforward
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: `income.capitalGainsOrLoss > 0` OR notes indicate prior-year capital losses
- **THEN**: Have any capital loss carryforwards from prior years been applied to offset current-year capital gains?
- **Rule**: Net capital losses in excess of $3,000 per year can be carried forward indefinitely to offset future capital gains (or up to $3,000 of ordinary income per year). If the taxpayer had net capital losses in prior years, verify: (1) the carryforward amount from last year's Schedule D (line 16 or Worksheet); (2) it has been correctly applied to reduce current-year capital gains on Schedule D; (3) the remaining carryforward (if any) is preserved for future years. If prior-year losses are referenced in notes but no carryforward is applied against current gains, mark **possible_overpayment**.

### Qualified Opportunity Zone — Deferral or Exclusion
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: notes indicate investment in a Qualified Opportunity Fund (QOF) or a prior QOZ investment matures/is sold
- **THEN**: Was the Qualified Opportunity Zone gain deferral or exclusion correctly applied?
- **Rule**: Under IRC §1400Z-2, taxpayers who reinvest capital gains into a Qualified Opportunity Fund within 180 days may defer the original gain until the earlier of disposition or Dec 31, 2026. Gains on the QOF investment itself are excluded from income if held ≥10 years. If a QOF investment or prior deferral is present but Form 8997 is absent, mark **needs_more_info**.

### Qualified Small Business Stock (QSBS) — Section 1202
<!-- meta: state=ALL requires=income.capitalGainsOrLoss>0 -->
- **IF**: `income.capitalGainsOrLoss > 0` AND notes indicate the sale of stock in a startup, early-stage company, or small C-corporation that was held for more than 5 years
- **THEN**: Did you apply the Section 1202 exclusion to exclude up to 100% of the capital gain (up to $10 million)?
- **Rule**: Under IRC §1202, gain from the sale of Qualified Small Business Stock (QSBS) acquired after September 27, 2010 and held for more than 5 years is 100% excludable from federal income tax, up to the greater of $10 million or 10× the taxpayer's adjusted basis in the stock. To qualify: (1) the stock must have been issued by a domestic C-corporation (not S-corp, LLC, or partnership); (2) the corporation's aggregate gross assets must not have exceeded $50 million at the time of issuance; (3) the taxpayer must have acquired the stock at original issuance (not secondary market); (4) the corporation must be in a qualifying trade or business (technology, manufacturing, retail, wholesale — excludes professional services, finance, hospitality, and farming). The exclusion is reported on Form 8949 with a code "Q" notation, and the excluded amount is also an AMT preference item (though the 100% exclusion avoids AMT entirely for post-2010 stock). Common error: founders and early employees report the entire exit as a long-term capital gain on Form 8949 without claiming the §1202 exclusion. If a long-held startup or C-corp stock sale is present but no §1202 exclusion is claimed, mark **possible_overpayment**. If qualifying status is uncertain (company size, charter type), mark **needs_more_info**.

---

## Federal — Deductions

### Tips Deduction `[OBBBA]`
<!-- meta: state=ALL taxYear=>=2025 requires=income.tips>0 -->
- **IF**: `income.tips > 0` AND `taxYear >= 2025`
- **THEN**: Have you deducted up to $25,000 of your earned tips (hospitality, delivery, salons)?
- **Rule**: OBBBA provision, applies 2025–2028. Phases out completely for MAGI above $150,000 (single) / $300,000 (MFJ). Requires a valid SSN. Only applies to occupations customarily receiving tips per IRS list. Mark **na** if MAGI exceeds the threshold or OBBBA is not confirmed enacted.

### Overtime Premium Deduction `[OBBBA]`
<!-- meta: state=ALL taxYear=>=2025 requires=income.overtimePremium>0 -->
- **IF**: `income.overtimePremium > 0` AND `taxYear >= 2025`
- **THEN**: Have you deducted the "premium" portion of your overtime pay (up to $12,500 single / $25,000 joint)?
- **Rule**: OBBBA provision, applies 2025–2028. Only the premium portion (the "extra half" of time-and-a-half) qualifies — not the entire OT paycheck. W-2 employees only; self-employed do not qualify. Phases out at $100 per $1,000 of MAGI above $150,000 (single) / $300,000 (MFJ). Mark **na** if not confirmed enacted.

### Senior Standard Deduction `[OBBBA]`
<!-- meta: state=ALL taxYear=>=2025 requires=taxpayer.isAge65OrOlder=true||spouse.isAge65OrOlder=true -->
- **IF**: (`taxpayer.isAge65OrOlder = true` OR `spouse.isAge65OrOlder = true`) AND `taxYear >= 2025`
- **THEN**: Have you claimed the additional $6,000 senior deduction per qualifying person (on top of the existing age-65 standard deduction add-on)?
- **Rule**: OBBBA provision. The existing pre-OBBBA senior add-on ($2,000 single/HOH, $1,600 per MFJ spouse) is current law regardless. The new OBBBA $6,000 phases out for MAGI above $75,000 (single) / $150,000 (MFJ). If OBBBA status is uncertain, still verify the baseline existing add-on was claimed. Mark **na** for the $6,000 portion if OBBBA is not confirmed.

### Car Loan Interest Deduction `[OBBBA]`
<!-- meta: state=ALL taxYear=>=2025 -->
- **IF**: notes or deductions indicate a new vehicle purchase AND `taxYear >= 2025`
- **THEN**: Did you deduct up to $10,000 in interest paid on a new U.S.-built vehicle loan?
- **Rule**: OBBBA provision, applies 2025–2028. Vehicle must be new, final U.S. assembly, personal use, GVWR under 14,000 lbs, loan originated after Dec 31, 2024. Phases out at $200 per $1,000 of MAGI above $100,000 (single) / $200,000 (MFJ). Personal vehicle loan interest is not deductible under prior law — this check only applies if OBBBA is confirmed enacted. Mark **na** if uncertain.

### SALT Deduction `[OBBBA]`
<!-- meta: state=ALL requires=deductions.type=itemized -->
- **IF**: `deductions.type = itemized`
- **THEN**: Did you claim the maximum allowable SALT deduction? Check `deductions.itemizedDeductions.totalSaltDeduction`.
- **Rule**: For 2025, OBBBA (PL 119-21) raised the base SALT cap to $40,000. The effective cap phases down for high earners: effective cap = $40,000 − (30% × max(0, AGI − $500,000)), with a floor of $10,000. Compute the effective cap from `income.agi` and verify the claimed SALT deduction does not exceed it. MFS filers are capped at half. If claimed SALT exceeds the effective cap, mark **possible_underpayment**; if SALT appears significantly below the effective cap, mark **possible_overpayment**.
- **PTET Note**: If `income.k1` is present (S-corp or partnership income), the taxpayer's business may have made a Pass-Through Entity Tax (PTET) election, paying state income taxes at the entity level. PTET payments are deducted as a business expense above-the-line and are not subject to the individual SALT cap. If SALT appears limited by the cap but K-1 income is present, flag as **needs_more_info** and ask whether a PTET election was made — this can significantly reduce federal taxable income for high earners in states that allow PTET (NY, CA, NJ, CT, IL, and most others).

### Student Loan Interest Deduction
<!-- meta: state=ALL filing=NOT:MFS requires=income.agi<200000 -->
- **IF**: `income.wages > 0` AND `income.agi < 100000` AND `filingStatus != Married Filing Separately` AND student loan debt is indicated in notes or on the return
- **THEN**: Did you deduct up to $2,500 in student loan interest paid during the year?
- **Rule**: Max $2,500. Trigger on presence of student loan debt or Form 1098-E, not on whether the deduction was already taken. Phases out at $85,000–$100,000 (single) / $170,000–$200,000 (MFJ). Not available if the taxpayer is claimed as a dependent or files MFS. If `adjustmentsDetail.studentLoanInterest > 0` it was already claimed — mark **pass**. If student loans are mentioned in notes but the deduction is 0, mark **fail**.

### Qualified Business Income Deduction — Section 199A `[OBBBA]`
<!-- meta: state=ALL requires=income.selfEmploymentIncome>0 -->
- **IF**: `income.selfEmploymentIncome > 0` OR notes indicate self-employment, freelance, sole proprietorship, S-corp, or partnership income, OR `income.k1` shows S-corp or partnership pass-through income
- **THEN**: Did you claim the Section 199A Qualified Business Income (QBI) deduction on Form 8995 or Form 8995-A?
- **Rule**: OBBBA (PL 119-21) made the §199A deduction permanent. For 2025, eligible taxpayers may deduct up to 20% of QBI from a domestic pass-through business (sole proprietorship, S-corp, partnership, LLC). The deduction begins to phase out at taxable income of $197,300 (single) / $394,600 (MFJ). Above those thresholds, additional limitations apply based on W-2 wages paid and qualified property of the business (Form 8995-A). Key exclusions: specified service trades or businesses (SSTBs — law, health, consulting, financial services, performing arts) lose the deduction entirely above the upper threshold ($247,300 single / $494,600 MFJ for 2025). The deduction is limited to 20% of (taxable income minus net capital gains). For tax year 2026 and later, OBBBA also introduced a $400 minimum deduction for active participants with at least $1,000 in QBI — note this for 2026 planning. If self-employment or pass-through income is present but no QBI deduction appears on Schedule 1 line 13 or Form 8995, mark **possible_overpayment**. If taxable income is near the phase-out thresholds, mark **needs_more_info** to confirm SSTB status and W-2 wage limitation.

### R&E "Catch-Up" Expensing — Section 174A `[OBBBA]`
<!-- meta: state=ALL taxYear=2025 requires=income.selfEmploymentIncome>0 -->
- **IF**: (`income.selfEmploymentIncome > 0` OR `income.k1` shows business income) AND notes indicate software development, engineering, research, or product development activities AND `taxYear = 2025`
- **THEN**: Did you elect to immediately deduct all unamortized research and experimental (R&E) costs from tax years 2022–2024 under the OBBBA §174A catch-up provision?
- **Rule**: Under pre-OBBBA law (TCJA §174 as amended), domestic R&E costs incurred after December 31, 2021 had to be amortized over 5 years (15 years for foreign R&E) rather than expensed immediately. Many small businesses and self-employed developers accumulated significant unamortized R&E balances from 2022, 2023, and 2024. OBBBA §174A (PL 119-21) allows a one-time "catch-up" election in tax year 2025: any remaining unamortized R&E costs from 2022–2024 may be deducted in full in 2025. Additionally, OBBBA reinstated immediate expensing of domestic R&E costs for 2025 and beyond. This is potentially one of the largest above-the-line deductions available to tech founders, software developers, and engineering businesses in 2025. If the return shows business income and notes reference development activities, but no §174A catch-up deduction appears on Schedule C or a pass-through return, mark **needs_more_info** — the taxpayer should confirm with their preparer whether unamortized 2022–2024 R&E balances exist.

---

## Federal — Credits

### Child Tax Credit
<!-- meta: state=ALL requires=hasDependents -->
- **IF**: any dependent has `age < 17`
- **THEN**: Are you claiming the full Child Tax Credit for each qualifying child? Check `credits.childTaxCredit`.
- **Rule**: Under current law (TCJA), the CTC is $2,000 per child, with a refundable ACTC portion up to $1,700. Phases out at $200,000 (single) / $400,000 (MFJ). Under OBBBA `[OBBBA]` (if enacted): $2,200 per child. Verify which law applies to this tax year and whether the correct per-child amount was used.

### Trump Account (Treasury Baby Bonus) `[OBBBA]`
<!-- meta: state=ALL taxYear=>=2025 requires=hasDependents -->
- **IF**: any dependent has `yearOfBirth >= 2025` AND `yearOfBirth <= 2028` AND `taxYear >= 2025`
- **THEN**: Did you elect the $1,000 Treasury-seeded savings account for a child born 2025–2028?
- **Rule**: OBBBA provision. If enacted: U.S. citizens with valid SSNs born Jan 1, 2025 – Dec 31, 2028 may be eligible. The IRS form number and exact mechanics were not finalized at the time this check was written — verify current IRS guidance before applying. Mark **na** if OBBBA is not confirmed enacted or if IRS has not issued implementing guidance.

### Child and Dependent Care Credit
<!-- meta: state=ALL requires=household.childcareExpensesPaid>0 -->
- **IF**: `household.childcareExpensesPaid > 0`
- **THEN**: Are you claiming the Child and Dependent Care Credit? Check `credits.childDependentCareCredit`.
- **Rule**: For 2025, unchanged from prior law: 20%–35% of qualifying expenses up to $3,000 (one dependent) / $6,000 (two or more). Major OBBBA enhancements (50% rate, higher limits) apply starting 2026 only.

### Foreign Tax Credit
<!-- meta: state=ALL requires=income.foreignTaxPaid>0||income.foreignDividends>0 -->
- **IF**: `income.foreignTaxPaid > 0` OR `income.foreignDividends > 0`
- **THEN**: Did you claim a Foreign Tax Credit on your 1099-DIV? Check `credits.foreignTaxCredit`.

### Clean Vehicle & Home Energy Credits — OBBBA Expiration Deadlines `[OBBBA]`
<!-- meta: state=ALL taxYear=2025 -->
- **IF**: notes mention an electric vehicle (EV), plug-in hybrid, or new vehicle purchase AND `taxYear = 2025`
- **THEN**: Was the vehicle acquired **on or before September 30, 2025**? Under OBBBA (PL 119-21), the New Clean Vehicle Credit (IRC §30D) is not allowed for any vehicle acquired after September 30, 2025. If the vehicle was acquired October 1, 2025 or later, the credit is unavailable — mark **na**. If acquired on or before that date and no §30D credit appears on Form 8936, mark **possible_overpayment**.
- **IF**: notes mention solar panels, heat pumps, windows, doors, insulation, or other home energy improvements AND `taxYear = 2025`
- **THEN**: Was the property placed in service **on or before December 31, 2025**? OBBBA terminated the Energy Efficient Home Improvement Credit (§25C) and the Residential Clean Energy Credit (§25D) for property placed in service after December 31, 2025. If placed in service during 2025 and no credit appears on Form 5695, mark **possible_overpayment**. If placed in service in 2026 or later, mark **na**.

---

## State — All (Federal Preemptions)

These checks apply to any taxpayer filing a state income tax return. They stem from federal law that overrides state taxation rules regardless of the state.

### U.S. Government Obligation Interest — State Exemption (31 U.S.C. § 3124)
<!-- meta: state=ALL requires=income.taxableInterest>0 -->
- **IF**: `income.taxableInterest > 0` AND the taxpayer files a state income tax return (i.e. `residenceState` is not WA, TX, FL, SD, NV, WY, AK, NH, TN)
- **THEN**: Did you exclude interest from U.S. government obligations (Treasury bills, notes, bonds, Series EE/I savings bonds) from your state taxable income?
- **Rule**: Under 31 U.S.C. § 3124, interest on direct obligations of the U.S. government is exempt from state and local income tax. This interest is fully taxable federally (included in `income.taxableInterest`) but must be subtracted from state AGI. Common sources: Treasury Direct accounts, T-bill/T-note/T-bond interest reported on 1099-INT Box 3, Series EE/I savings bond interest. Note: interest from GSE obligations (FNMA, FHLMC) is NOT exempt under § 3124 — only direct U.S. government obligations. FHLB and Farm Credit bonds have their own separate statutory exemptions (see checks below). If no breakdown of interest sources is available, mark **needs_more_info**.

### Federal Home Loan Bank (FHLB) Bond Interest — State Exemption (12 U.S.C. § 1433)
<!-- meta: state=ALL requires=income.taxableInterest>0 -->
- **IF**: `income.taxableInterest > 0` AND the taxpayer files a state income tax return (i.e. `residenceState` is not WA, TX, FL, SD, NV, WY, AK, NH, TN)
- **THEN**: Did you exclude any Federal Home Loan Bank (FHLB) bond interest from your state taxable income?
- **Rule**: Under 12 U.S.C. § 1433, interest on FHLB notes, bonds, and debentures is exempt from all state and local income taxes. Unlike U.S. Treasury interest (1099-INT Box 3), FHLB interest typically appears in Box 1 of Form 1099-INT — so it is not automatically identified as state-exempt. Taxpayers holding FHLB bonds directly or through a money market fund that holds FHLB paper must manually subtract the exempt portion on their state return using the fund's annual percentage disclosure. If no information about the composition of interest income is available, mark **needs_more_info**.

### Farm Credit System Bond Interest — State Exemption (12 U.S.C. § 2023)
<!-- meta: state=ALL requires=income.taxableInterest>0 -->
- **IF**: `income.taxableInterest > 0` AND the taxpayer files a state income tax return (i.e. `residenceState` is not WA, TX, FL, SD, NV, WY, AK, NH, TN)
- **THEN**: Did you exclude any Farm Credit System bond interest (Federal Land Banks, Farm Credit Banks, Banks for Cooperatives, Federal Farm Credit Banks Funding Corporation) from your state taxable income?
- **Rule**: Under 12 U.S.C. § 2023, interest on Farm Credit System obligations is exempt from state and local income taxes. Like FHLB interest, this typically appears in Box 1 of Form 1099-INT and must be manually subtracted on the state return. Taxpayers invested in money market funds or bond funds that hold Farm Credit paper must use the fund's annual disclosure to compute the exempt percentage. If no breakdown of interest income is available, mark **needs_more_info**.

### Railroad Retirement Annuities — State Exemption (45 U.S.C. § 231m)
<!-- meta: state=ALL requires=income.taxablePensions>0 -->
- **IF**: `income.taxablePensions > 0` OR notes indicate Railroad Retirement Board (RRB) benefits
- **THEN**: Did you exclude all Railroad Retirement annuity income from your state taxable income?
- **Rule**: Under 45 U.S.C. § 231m, all Railroad Retirement Act annuities — including Tier I (SSEB and NSSEB), Tier II, vested dual benefit (VDB), and supplemental annuity payments — are exempt from all state income taxes without exception. Tier I SSEB is reported on Form RRB-1099 (taxed federally like Social Security); Tier II and NSSEB are reported on Form RRB-1099-R (taxed federally like pension income). Both forms' amounts are fully exempt from state income tax regardless of how the state normally treats pension or Social Security income. This is an absolute federal preemption — states have no authority to tax these benefits. Mark **possible_overpayment** if railroad retirement income appears to have been included in state taxable income.

### Active-Duty Military Pay — Non-Domicile State Exemption (SCRA, 50 U.S.C. § 4001)
<!-- meta: state=ALL -->
- **IF**: notes or W-2 information indicate the taxpayer is an active-duty servicemember AND the state of legal domicile differs from the state of current residence/station
- **THEN**: Did the non-domicile duty-station state correctly exclude the servicemember's military compensation from state taxable income?
- **Rule**: Under the Servicemembers Civil Relief Act (SCRA), 50 U.S.C. § 4001, a state may not tax the military compensation of an active-duty servicemember who is present in that state solely in compliance with military orders and whose legal domicile is a different state. Only the state of legal domicile may tax military pay. The servicemember should file only in their domicile state and claim exemption from any withholding by the duty-station state. Does not apply to civilian income earned in the duty-station state. If the return shows only one state or the servicemember is stationed in their domicile state, mark **na**.

### Military Spouse Wages — Non-Domicile State Exemption (MSRRA, 50 U.S.C. § 4001)
<!-- meta: state=ALL filing=MFJ -->
- **IF**: `filingStatus = Married Filing Jointly` AND notes indicate the spouse is a military spouse accompanying a servicemember on orders to a state other than their domicile
- **THEN**: Did the duty-station state correctly exclude the military spouse's wages from state taxable income?
- **Rule**: Under the Military Spouses Residency Relief Act (MSRRA), as amended by the Veterans Benefits and Transition Act of 2018, the income of a qualifying military spouse present in a state solely to accompany the servicemember on military orders is exempt from taxation by that duty-station state. The spouse files in their state of domicile only. The spouse may elect the servicemember's domicile, their own prior domicile, or the permanent duty-station state — once per year. Does not apply to business income or rental income sourced in the duty-station state. If the return shows a single-state filing or no military context is present, mark **na**.

### Military and Federal Civilian Retirement Pay — State Nondiscrimination (4 U.S.C. § 111)
<!-- meta: state=ALL requires=income.taxablePensions>0 -->
- **IF**: `income.taxablePensions > 0` AND notes or 1099-R information indicate military retirement pay or federal civilian (CSRS/FERS) pension income AND the taxpayer files a state income tax return
- **THEN**: Does the state provide equal treatment to federal military/civilian retirement pay as it does to its own state and local government pensions?
- **Rule**: Under 4 U.S.C. § 111 and the Supreme Court's decisions in Davis v. Michigan (1989) and Barker v. Kansas (1992), a state that exempts its own state or local government pension income must extend the same exemption to federal military retirement pay and federal civilian (CSRS/FERS) retirement pay. If the state treats comparable state/local pension income more favorably than federal retirement income on this return, it is a possible overpayment. Note: this is a nondiscrimination rule, not an absolute exemption — states may tax all retirement income equally. Check whether the taxpayer's state grants any retirement income exemption, and if so, whether the federal pension was given the same treatment.

### VA Disability Compensation — State Exemption (38 U.S.C. § 5301)
<!-- meta: state=ALL -->
- **IF**: notes indicate the taxpayer receives VA disability compensation, VA pension, or Dependency and Indemnity Compensation (DIC)
- **THEN**: Were VA disability or pension benefits excluded from state taxable income?
- **Rule**: Under 38 U.S.C. § 5301(a)(1), all payments of VA benefits are "exempt from taxation" under federal law. VA disability compensation and pension payments do not generate a 1099 and are excluded from federal gross income — but some state software or manual entries may inadvertently include them. If VA benefits appear in the notes but no corresponding income line is present on the return, mark **verified**. If the notes indicate VA benefits and the income figures appear higher than wages alone can explain, mark **needs_more_info**.

---

## State — Washington (WA)

### Federal Sales Tax Deduction
<!-- meta: state=WA requires=deductions.type=itemized -->
- **IF**: `residenceState = WA` AND `deductions.type = itemized`
- **THEN**: Did you maximize your Federal Sales Tax deduction (since WA has no income tax)? Check `deductions.itemizedDeductions.stateLocalSalesTax`.

### Working Families Tax Credit
<!-- meta: state=WA requires=income.agi<68675 -->
- **IF**: `residenceState = WA` AND `income.agi` is within EITC-equivalent limits
- **THEN**: Did you apply for the WA Working Families Tax Credit (up to $1,330)?
- **Rule**: Max credit is $1,330 (3+ qualifying children). Income limits mirror federal EITC thresholds: ~$61,555 (single/HOH) / ~$68,675 (MFJ) for 3+ children; lower for fewer children. Minimum credit is $50.

---

## State — California (CA)

### Renter's Credit
<!-- meta: state=CA requires=household.rentPaid>0 -->
- **IF**: `residenceState = CA` AND `household.rentPaid > 0`
- **THEN**: Did you claim the CA Nonrefundable Renter's Credit on Form 540?

### Young Child Tax Credit
<!-- meta: state=CA requires=hasDependents -->
- **IF**: `residenceState = CA` AND any dependent has `age < 6`
- **THEN**: Did you claim the CA Young Child Tax Credit (up to $1,189)?
- **Rule**: For 2025, the credit is up to $1,189 per eligible return (inflation-adjusted). Requires qualifying for CalEITC with earned income ≤ $32,900. The credit phases out as income approaches $50,000.

---

## State — New York (NY)

### Empire State Child Credit
<!-- meta: state=NY requires=hasDependents -->
- **IF**: `residenceState = NY` AND any dependent has `age < 17`
- **THEN**: Did you claim the Empire State Child Credit?
- **Rule**: For 2025: up to $1,000 per child under age 4; $330 per child ages 4–16. Full credit available at income below $75,000 (single/HOH) / $110,000 (MFJ). Major expansion — verify the correct age-tiered amounts were applied.

---

## State — New Jersey (NJ)

### ANCHOR / Stay NJ Program
<!-- meta: state=NJ -->
- **IF**: `residenceState = NJ` AND (`deductions.itemizedDeductions.realEstateTaxes > 0` OR `household.rentPaid > 0`)
- **THEN**: Did you file for the NJ ANCHOR program or Stay NJ relief?

---

## State — Massachusetts (MA)

### Rent Deduction
<!-- meta: state=MA requires=household.rentPaid>0 -->
- **IF**: `residenceState = MA` AND `household.rentPaid > 0`
- **THEN**: Did you deduct 50% of rent paid (up to $4,000) on your MA Form 1?
- **Rule**: Applies to principal MA residence. No income limit. MFS filers capped at $2,000 each.

### Child and Family Tax Credit
<!-- meta: state=MA requires=hasDependents -->
- **IF**: `residenceState = MA` AND number of dependents > 0
- **THEN**: Did you claim the $440 per-dependent Child and Family Tax Credit on Schedule CF?
- **Rule**: Covers children under 13, dependents who are 65+ or disabled, or a spouse needing care.

---

## State — Virginia (VA)

### Age Deduction
<!-- meta: state=VA requires=taxpayer.isAge65OrOlder=true||spouse.isAge65OrOlder=true -->
- **IF**: `residenceState = VA` AND (`taxpayer.isAge65OrOlder = true` OR `spouse.isAge65OrOlder = true`)
- **THEN**: Did you claim the $12,000 Age Deduction on VA Schedule ADJ?
- **Rule**: Phases out dollar-for-dollar once AFAGI exceeds $50,000 (single) / $75,000 (MFJ combined). Taxpayers born before Jan 1, 1939 claim the full $12,000 regardless of income. Mark **na** if income exceeds the threshold.

---

## State — Texas (TX) / Florida (FL)

### Federal Sales Tax Deduction
<!-- meta: state=TX|FL requires=deductions.type=itemized -->
- **IF**: (`residenceState = TX` OR `residenceState = FL`) AND `deductions.type = itemized`
- **THEN**: Did you deduct Sales Tax on your federal return (since TX/FL have no state income tax)?

### FL Widow/Widower Property Tax Exemption
<!-- meta: state=FL filing=QW -->
- **IF**: `residenceState = FL` AND `filingStatus = Qualifying Widow(er)`
- **THEN**: Did you claim the $5,000 FL property tax exemption at your county property appraiser's office?

---

## State — Georgia (GA)

### Retirement Income Exclusion
<!-- meta: state=GA requires=taxpayer.isAge65OrOlder=true||spouse.isAge65OrOlder=true,income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = GA` AND (`taxpayer.isAge65OrOlder = true` OR `spouse.isAge65OrOlder = true`) AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you exclude up to $65,000 of retirement income from GA state taxation on Form 500?
- **Rule**: Each qualifying spouse on a joint return claims separately (up to $65,000 each). Social Security is separately exempt and does not count against this limit. Ages 62–64 may exclude up to $35,000.

---

## State — North Carolina (NC)

### Social Security Exemption
<!-- meta: state=NC requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = NC` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you confirm that zero NC state tax was applied to your Social Security benefits?

---

## State — Illinois (IL)

### Child Tax Credit (State)
<!-- meta: state=IL requires=hasDependents -->
- **IF**: `residenceState = IL` AND any dependent has `age < 12`
- **THEN**: Did you use the 40% Child Tax Credit calculation on your IL Schedule IL-E/EITC?
- **Rule**: 40% of the taxpayer's Illinois EITC. Qualifying child must be under age 12 as of Dec 31, 2025. Claimed on Schedule IL-E/EITC (not Schedule ICR). Requires qualifying for the Illinois EITC.

---

## State — Pennsylvania (PA)

### 529 Plan Deduction
<!-- meta: state=PA -->
- **IF**: `residenceState = PA`
- **THEN**: Did you deduct up to $19,000 per beneficiary in 529 Plan contributions on your PA-40?
- **Rule**: For 2025, the deduction limit is $19,000 per beneficiary per taxpayer (tied to the federal annual gift tax exclusion under IRC §2503(b), which increased from $18,000 to $19,000 in 2025). Married couples can each deduct $19,000 (up to $38,000 combined per beneficiary). PA allows deductions to any state's 529 plan.

---

## State — Ohio (OH)

### Joint Filer Credit
<!-- meta: state=OH filing=MFJ -->
- **IF**: `residenceState = OH` AND `filingStatus = Married Filing Jointly`
- **THEN**: Did you claim the Joint Filer Credit (up to $650) on your OH IT 1040?
- **Rule**: Both spouses must have at least $500 of qualifying income. Available only to taxpayers with MAGI ≤ $750,000 for 2025 (drops to $500,000 for 2026+).

---

## State — Arizona (AZ)

### Charitable Tax Credits (Dollar-for-Dollar)
<!-- meta: state=AZ -->
- **IF**: `residenceState = AZ`
- **THEN**: Did you make donations to a Qualifying Charitable Organization (up to $470 single / $938 MFJ), Foster Care Charitable Organization (up to $618 single / $1,232 MFJ), or School Tuition Organization (up to $1,459 single / $2,910 MFJ)? These are dollar-for-dollar credits against AZ tax.

### Public School Tax Credit
<!-- meta: state=AZ -->
- **IF**: `residenceState = AZ`
- **THEN**: Did you contribute to a public or charter school extracurricular program and claim the credit (up to $200 single / $400 MFJ) against AZ tax?

### Retirement Income Subtraction (Age 60+)
<!-- meta: state=AZ requires=taxpayer.isAge65OrOlder=true||spouse.isAge65OrOlder=true,income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = AZ` AND (`taxpayer.isAge65OrOlder = true` OR `spouse.isAge65OrOlder = true` OR age >= 60) AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you subtract up to $6,000 (single) / $12,000 (MFJ) of retirement distributions from AZ taxable income?

---

## State — Colorado (CO)

### Family Affordability Tax Credit
<!-- meta: state=CO requires=hasDependents,income.agi<96000 -->
- **IF**: `residenceState = CO` AND any dependent has `age < 17` AND `income.agi < 96000`
- **THEN**: Did you claim the CO Family Affordability Tax Credit (up to $3,200 per child under 6, up to $2,400 per child ages 6–16)? This credit is refundable.

### Colorado EITC (50% of Federal)
<!-- meta: state=CO requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = CO` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim Colorado's EITC, equal to 50% of the federal credit (refundable)?
- **Rule**: Trigger on earned income and approximate EITC income eligibility, not on whether the federal EITC was already claimed. Verify federal EITC eligibility first; if eligible, the CO credit should also have been claimed.

### Retirement Income Subtraction (Age 55+)
<!-- meta: state=CO requires=taxpayer.isAge65OrOlder=true||spouse.isAge65OrOlder=true,income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = CO` AND (`taxpayer.isAge65OrOlder = true` OR age >= 55) AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you subtract up to $20,000 of qualifying retirement income from CO taxable income?

---

## State — Connecticut (CT)

### Social Security / Pension Exemption
<!-- meta: state=CT requires=income.agi<100000,income.socialSecurityBenefits>0||income.taxablePensions>0 -->
- **IF**: `residenceState = CT` AND (`income.socialSecurityBenefits > 0` OR `income.taxablePensions > 0`) AND `income.agi < 100000`
- **THEN**: Did you fully exempt Social Security and qualifying pension/IRA income from CT income tax (available when AGI is under $75,000 single / $100,000 MFJ)?

### IRA Income Deduction (75% for TY2025)
<!-- meta: state=CT requires=income.taxableIRADistributions>0 -->
- **IF**: `residenceState = CT` AND `income.taxableIRADistributions > 0`
- **THEN**: Did you deduct 75% of IRA distributions on your CT return? (CT is phasing in a full IRA exemption; 75% applies for TY2025, 100% in TY2026.)

### Connecticut EITC (40% of Federal + $250)
<!-- meta: state=CT requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = CT` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim CT's EITC (40% of the federal credit, plus $250 if you have at least one qualifying child)?
- **Rule**: Trigger on earned income and approximate EITC income range. If the taxpayer qualifies for the federal EITC, the CT credit should also appear on the return.

---

## State — Hawaii (HI)

### Refundable Food / Excise Tax Credit
<!-- meta: state=HI requires=income.agi<20000 -->
- **IF**: `residenceState = HI` AND `income.agi < 20000`
- **THEN**: Did you claim Hawaii's refundable Food/Excise Tax Credit (~$110–$220 per qualified exemption)?

### Hawaii EITC (45% of Federal)
<!-- meta: state=HI requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = HI` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim Hawaii's EITC equal to 45% of the federal credit (refundable)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, HI credit should also be claimed.

---

## State — Idaho (ID)

### Grocery / Food Tax Credit
<!-- meta: state=ID -->
- **IF**: `residenceState = ID`
- **THEN**: Did you claim Idaho's grocery credit of $155 per person (yourself and all qualifying dependents)?

### Retirement Income Deduction (Age 65+)
<!-- meta: state=ID requires=taxpayer.isAge65OrOlder=true,income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = ID` AND `taxpayer.isAge65OrOlder = true` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you deduct up to $46,980 (single) / $93,960 (MFJ) of qualifying retirement income on your ID return?

---

## State — Indiana (IN)

### Renter's Deduction
<!-- meta: state=IN requires=household.rentPaid>0 -->
- **IF**: `residenceState = IN` AND `household.rentPaid > 0`
- **THEN**: Did you deduct up to $3,000 of rent paid on your Indiana IT-40 (property must be subject to Indiana property tax)?

### New Child Dependent Deduction
<!-- meta: state=IN requires=hasDependents -->
- **IF**: `residenceState = IN` AND any dependent has `yearOfBirth` equal to this tax year
- **THEN**: Did you claim Indiana's $3,000 deduction for a child born in this tax year (vs. $1,500 for children born in a prior year)?
- **Rule**: Indiana's "new" dependent deduction is based on year of birth, not on whether the dependent is new to the return. A child born in the current tax year qualifies for the $3,000 amount; children born in prior years receive $1,500. Evaluate using `dependent.yearOfBirth` compared to the current tax year.

---

## State — Iowa (IA)

### Retirement Income Exemption (Age 55+)
<!-- meta: state=IA requires=taxpayer.isAge65OrOlder=true||spouse.isAge65OrOlder=true,income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = IA` AND (`taxpayer.isAge65OrOlder = true` OR age >= 55) AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you fully exempt all qualifying retirement income from Iowa state income tax? (Iowa fully exempts retirement income for filers age 55+ under the new 3.8% flat rate.)

### Social Security Exemption
<!-- meta: state=IA requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = IA` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you confirm Iowa fully exempts Social Security benefits from state income tax?

---

## State — Kansas (KS)

### Homestead Refund
<!-- meta: state=KS requires=deductions.itemizedDeductions.realEstateTaxes>0,income.agi<58041 -->
- **IF**: `residenceState = KS` AND `deductions.itemizedDeductions.realEstateTaxes > 0` AND `income.agi < 58041`
- **THEN**: Did you file a Kansas Homestead Claim (K-40H) for up to $700 in property tax relief?

### Kansas EITC (17% of Federal)
<!-- meta: state=KS requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = KS` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim Kansas's EITC equal to 17% of the federal credit (refundable)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, KS credit should also be claimed.

---

## State — Kentucky (KY)

### Pension Income Exclusion ($31,110)
<!-- meta: state=KY requires=income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = KY` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you exclude up to $31,110 of qualifying retirement income per taxpayer from Kentucky state income tax?

### Social Security Exemption
<!-- meta: state=KY requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = KY` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you confirm Kentucky fully exempts all Social Security income from state tax?

---

## State — Louisiana (LA)

### School Tuition Expense Deduction
<!-- meta: state=LA requires=hasDependents -->
- **IF**: `residenceState = LA` AND any dependent attends a qualifying non-public K–12 school
- **THEN**: Did you deduct up to $6,000 per dependent child for tuition and required fees at a qualifying non-public school?

### New Flat Rate / Zero Tax Threshold *(Informational)*
<!-- meta: state=LA taxYear=>=2025 -->
- **IF**: `residenceState = LA`
- **THEN**: Confirm that the Louisiana return was prepared under the new 3% flat income tax structure effective TY2025 (standard deduction $12,500 single / $25,000 MFJ). Filers below those thresholds owe zero LA income tax. This is a structural law change — verify the correct rate was applied, not a pass/fail opportunity check.
- **Rule**: Always mark **info** for this check. It is a reminder to verify the correct law was applied, not a missed deduction or credit.

---

## State — Maine (ME)

### Property Tax Fairness Credit
<!-- meta: state=ME requires=deductions.itemizedDeductions.realEstateTaxes>0||household.rentPaid>0 -->
- **IF**: `residenceState = ME` AND (`deductions.itemizedDeductions.realEstateTaxes > 0` OR `household.rentPaid > 0`)
- **THEN**: Did you claim Maine's refundable Property Tax Fairness Credit (up to $1,000, or $2,000 if age 65+)?

### Pension Income Deduction
<!-- meta: state=ME requires=income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = ME` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you deduct up to $48,216 of qualifying non-military pension income on your Maine return?

### Maine EITC (25% of Federal)
<!-- meta: state=ME requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = ME` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim Maine's EITC equal to 25% of the federal credit (refundable)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, ME credit should also be claimed.

---

## State — Maryland (MD)

### Senior Tax Credit ($1,000 / $1,750)
<!-- meta: state=MD requires=taxpayer.isAge65OrOlder=true -->
- **IF**: `residenceState = MD` AND `taxpayer.isAge65OrOlder = true`
- **THEN**: Did you claim Maryland's senior tax credit ($1,000 single for AGI under $100,000, or $1,750 MFJ for AGI under $150,000) on MD Form 502?

### Pension Exclusion ($41,200)
<!-- meta: state=MD requires=taxpayer.isAge65OrOlder=true,income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = MD` AND `taxpayer.isAge65OrOlder = true` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you apply Maryland's pension exclusion of up to $41,200, reduced by Social Security and Railroad Retirement benefits received?

### Social Security Exemption
<!-- meta: state=MD requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = MD` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you confirm Maryland fully exempts Social Security income from state tax?

---

## State — Michigan (MI)

### Pension / Retirement Deduction (Tiered by Birth Year)
<!-- meta: state=MI requires=income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = MI` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you apply Michigan's tiered pension deduction? Born before 1946: fully exempt. Born 1946–1966: deduct up to 75% of $49,422 (single) / $98,845 (MFJ) for TY2025. Verify the correct tier was applied.

### Homestead Property Tax Credit
<!-- meta: state=MI requires=income.agi<71500 -->
- **IF**: `residenceState = MI` AND `income.agi < 71500`
- **THEN**: Did you file MI-1040CR for Michigan's Homestead Property Tax Credit (up to $1,800 for homeowners and qualifying renters)?

---

## State — Minnesota (MN)

### Child Tax Credit ($1,750 per child)
<!-- meta: state=MN requires=hasDependents -->
- **IF**: `residenceState = MN` AND any dependent has `age < 18`
- **THEN**: Did you claim Minnesota's refundable Child Tax Credit of $1,750 per child under 18? Credit phases out above $29,500 AGI (single) / $35,000 (MFJ).

### Renter's Property Tax Credit
<!-- meta: state=MN requires=household.rentPaid>0,income.agi<77570 -->
- **IF**: `residenceState = MN` AND `household.rentPaid > 0` AND `income.agi < 77570`
- **THEN**: For TY2025, the MN Renter's Credit is now claimed on Form M1 (not a separate M1PR). Did you include the Renter's Credit schedule on your M1?

---

## State — Mississippi (MS)

### Full Retirement Income Exemption
<!-- meta: state=MS requires=income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = MS` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you fully exempt all qualifying 401(k), IRA, 403(b), pension, and annuity income from Mississippi state income tax?

### Social Security Exemption
<!-- meta: state=MS requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = MS` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you confirm Mississippi fully exempts Social Security and Railroad Retirement benefits from state income tax?

---

## State — Missouri (MO)

### Circuit Breaker Property Tax Credit (Seniors)
<!-- meta: state=MO requires=taxpayer.isAge65OrOlder=true,income.agi<34000 -->
- **IF**: `residenceState = MO` AND `taxpayer.isAge65OrOlder = true` AND `income.agi < 34000`
- **THEN**: Did you file Missouri's MO-PTC for the Circuit Breaker Credit (up to $750 for renters, up to $1,100 for homeowners)?

### Social Security Exemption
<!-- meta: state=MO requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = MO` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you exclude Missouri's Social Security exemption (fully exempt for most filers — MO exempts up to the maximum SS benefit amount of ~$47,633)?

---

## State — Montana (MT)

### Elderly Homeowner / Renter Credit (Age 62+)
<!-- meta: state=MT requires=taxpayer.isAge65OrOlder=true||spouse.isAge65OrOlder=true,income.agi<45000 -->
- **IF**: `residenceState = MT` AND (`taxpayer.isAge65OrOlder = true` OR age >= 62) AND `income.agi < 45000`
- **THEN**: Did you claim Montana's refundable Elderly Homeowner/Renter Credit (up to $1,150) on Schedule 2EC?

### Capital Gains Tax Credit
<!-- meta: state=MT requires=income.capitalGainsOrLoss>0 -->
- **IF**: `residenceState = MT` AND `income.capitalGainsOrLoss > 0`
- **THEN**: Did you claim Montana's capital gains credit equal to 2% of qualifying net long-term capital gains?

---

## State — Nebraska (NE)

### Social Security Full Exemption (New for TY2025)
<!-- meta: state=NE taxYear=>=2025 requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = NE` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you subtract 100% of federally taxable Social Security benefits from Nebraska income? Nebraska moved to a full exemption for TY2025 (up from 80% in TY2024).

### Nebraska Property Tax Credit
<!-- meta: state=NE requires=deductions.itemizedDeductions.realEstateTaxes>0 -->
- **IF**: `residenceState = NE` AND `deductions.itemizedDeductions.realEstateTaxes > 0`
- **THEN**: Did you claim Nebraska's income tax credit for property taxes paid on Nebraska real estate (Form PTC)?

---

## State — Nevada (NV)

### Federal Sales Tax Deduction
<!-- meta: state=NV requires=deductions.type=itemized -->
- **IF**: `residenceState = NV` AND `deductions.type = itemized`
- **THEN**: Did you deduct general sales taxes on federal Schedule A (NV has no state income tax)? You may also add actual sales tax paid on major purchases like vehicles.

---

## State — New Hampshire (NH)

### Interest & Dividends Tax Repealed
<!-- meta: state=NH taxYear=>=2025 -->
- **IF**: `residenceState = NH`
- **THEN**: The NH Interest & Dividends Tax was fully repealed effective January 1, 2025. No NH income tax return is required. Were you or your preparer still withholding or filing a NH I&D return unnecessarily?

### Federal Sales Tax Deduction
<!-- meta: state=NH requires=deductions.type=itemized -->
- **IF**: `residenceState = NH` AND `deductions.type = itemized`
- **THEN**: Did you deduct general sales taxes on federal Schedule A (NH has no state income tax)?

---

## State — New Mexico (NM)

### Social Security Exemption
<!-- meta: state=NM requires=income.socialSecurityBenefits>0,income.agi<150000 -->
- **IF**: `residenceState = NM` AND `income.socialSecurityBenefits > 0` AND `income.agi < 150000`
- **THEN**: Did you fully exempt Social Security benefits from New Mexico income tax (available when AGI is under $100,000 single / $150,000 MFJ)?

### Working Families Tax Credit (25% of Federal EITC)
<!-- meta: state=NM requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = NM` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim New Mexico's Working Families Tax Credit equal to 25% of the federal EITC (refundable)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, NM credit should also be claimed.

### Child Tax Credit (Up to $600 per Child)
<!-- meta: state=NM requires=hasDependents -->
- **IF**: `residenceState = NM` AND any dependent has `age < 17`
- **THEN**: Did you claim New Mexico's refundable Child Tax Credit of up to $600 per qualifying child?

---

## State — North Dakota (ND)

### Zero Tax Bracket Check
<!-- meta: state=ND -->
- **IF**: `residenceState = ND`
- **THEN**: Did you confirm whether any ND income tax is actually owed? Many moderate-income filers owe zero ND income tax after the standard deduction and low rate structure.

---

## State — Oklahoma (OK)

### Senior Retirement Income Deduction ($10,000)
<!-- meta: state=OK requires=taxpayer.isAge65OrOlder=true,income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = OK` AND `taxpayer.isAge65OrOlder = true` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you deduct up to $10,000 of qualifying retirement income from Oklahoma taxable income, in addition to the full Social Security exemption?

### Sales Tax Relief Credit
<!-- meta: state=OK requires=income.agi<50000 -->
- **IF**: `residenceState = OK` AND `income.agi < 50000`
- **THEN**: Did you claim Oklahoma's Sales Tax Relief Credit (Form 538-S) — $40 per household member for eligible seniors, disabled taxpayers, or those with dependents?

---

## State — Oregon (OR)

### Oregon Kids Credit ($1,050 per child under 6)
<!-- meta: state=OR requires=hasDependents,income.agi<31550 -->
- **IF**: `residenceState = OR` AND any dependent has `age < 6` AND `income.agi < 31550`
- **THEN**: Did you claim Oregon's refundable Kids Credit of up to $1,050 per child under age 6 (phases out between $26,550 and $31,550 AGI)?

### Oregon EITC (9%–12% of Federal)
<!-- meta: state=OR requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = OR` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim Oregon's EITC — 12% of the federal credit if you have a dependent under age 3, or 9% for all other eligible filers (refundable)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, OR credit should also be claimed.

### Oregon 529 Education Savings Credit
<!-- meta: state=OR -->
- **IF**: `residenceState = OR`
- **THEN**: Did you claim Oregon's refundable credit of up to $180 (single) / $360 (MFJ) for contributions to an Oregon 529 plan?

---

## State — Rhode Island (RI)

### Property Tax Relief Circuit Breaker (Age 65+ / Disabled)
<!-- meta: state=RI requires=taxpayer.isAge65OrOlder=true,income.agi<39275 -->
- **IF**: `residenceState = RI` AND `taxpayer.isAge65OrOlder = true` AND `income.agi < 39275`
- **THEN**: Did you claim Rhode Island's Circuit Breaker credit (up to $700) on Form RI-1040H? Renters qualify with 20% of gross rent treated as property tax.

### Rhode Island EITC (16% of Federal)
<!-- meta: state=RI requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = RI` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim Rhode Island's EITC equal to 16% of the federal credit (refundable)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, RI credit should also be claimed.

---

## State — South Carolina (SC)

### Retirement Income Deduction (Age 65+: $10,000)
<!-- meta: state=SC requires=income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = SC` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you deduct up to $10,000 of qualifying retirement income if age 65+, or $3,000 if under 65, from SC taxable income?

### Senior Deduction ($15,000 against any income)
<!-- meta: state=SC requires=taxpayer.isAge65OrOlder=true -->
- **IF**: `residenceState = SC` AND `taxpayer.isAge65OrOlder = true`
- **THEN**: Did you claim South Carolina's $15,000 senior deduction against any SC income (reduced by retirement deductions already claimed)?

### Child Under Age 6 Bonus Deduction
<!-- meta: state=SC requires=hasDependents -->
- **IF**: `residenceState = SC` AND any dependent has `age < 6`
- **THEN**: Did you claim SC's additional deduction (~$4,930) for each dependent child under age 6?

---

## State — South Dakota (SD)

### Federal Sales Tax Deduction
<!-- meta: state=SD requires=deductions.type=itemized -->
- **IF**: `residenceState = SD` AND `deductions.type = itemized`
- **THEN**: Did you deduct general sales taxes on federal Schedule A (SD has no state income tax)? Add actual sales tax on major purchases like vehicles.

---

## State — Tennessee (TN)

### Federal Sales Tax Deduction
<!-- meta: state=TN requires=deductions.type=itemized -->
- **IF**: `residenceState = TN` AND `deductions.type = itemized`
- **THEN**: Did you deduct Tennessee's relatively high combined sales tax (~9.75%) on federal Schedule A? TN has no state income tax.

---

## State — Utah (UT)

### Social Security Benefits Credit (4.5%)
<!-- meta: state=UT requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = UT` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you claim Utah's nonrefundable credit equal to 4.5% of federally taxable Social Security income (phases out above $54,000 single / $90,000 MFJ)?

### Retirement Credit (Born on or before Dec 31, 1952)
<!-- meta: state=UT requires=income.taxableIRADistributions>0||income.taxablePensions>0 -->
- **IF**: `residenceState = UT` AND `taxpayer.yearOfBirth <= 1952` AND (`income.taxableIRADistributions > 0` OR `income.taxablePensions > 0`)
- **THEN**: Did you determine whether Utah's Retirement Credit (up to $450) or the Social Security Benefits Credit gives the greater benefit? They cannot both be claimed.
- **Rule**: Eligibility is based on birth year (born on or before Dec 31, 1952), not simply age 65+. Use `taxpayer.yearOfBirth` if available; fall back to age only if birth year is not extracted.

---

## State — Vermont (VT)

### Homeowner Property Tax Credit (Up to $8,000)
<!-- meta: state=VT requires=deductions.itemizedDeductions.realEstateTaxes>0,income.agi<136900 -->
- **IF**: `residenceState = VT` AND `deductions.itemizedDeductions.realEstateTaxes > 0` AND `income.agi < 136900`
- **THEN**: Did you file Vermont's Homestead Declaration and Schedule HS-122 to claim up to $8,000 in property tax credit?

### Renter Credit
<!-- meta: state=VT requires=household.rentPaid>0 -->
- **IF**: `residenceState = VT` AND `household.rentPaid > 0`
- **THEN**: Did you claim Vermont's Renter Credit (10% of fair market rent for your family size and county)?

### Vermont EITC (38% of Federal)
<!-- meta: state=VT requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = VT` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim Vermont's EITC equal to 38% of the federal credit (refundable)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, VT credit should also be claimed.

---

## State — West Virginia (WV)

### Social Security Exemption (65% for TY2025)
<!-- meta: state=WV requires=income.socialSecurityBenefits>0 -->
- **IF**: `residenceState = WV` AND `income.socialSecurityBenefits > 0`
- **THEN**: Did you exempt 65% of Social Security income on your WV return? (100% exempt if AGI is under $50,000 single / $100,000 MFJ. Full 100% exemption for all filers begins TY2026.)

### Senior Deduction ($8,000 per qualifying person)
<!-- meta: state=WV requires=taxpayer.isAge65OrOlder=true -->
- **IF**: `residenceState = WV` AND `taxpayer.isAge65OrOlder = true`
- **THEN**: Did you claim West Virginia's $8,000 deduction per qualifying person aged 65+ or permanently disabled ($16,000 combined on a joint return)?

---

## State — Wisconsin (WI)

### Homestead Credit (Age 62+ / Disabled, Income under $24,680)
<!-- meta: state=WI requires=taxpayer.isAge65OrOlder=true||spouse.isAge65OrOlder=true,income.agi<24680 -->
- **IF**: `residenceState = WI` AND (`taxpayer.isAge65OrOlder = true` OR age >= 62) AND `income.agi < 24680`
- **THEN**: Did you file Schedule H or H-EZ to claim Wisconsin's refundable Homestead Credit for property tax relief?

### Wisconsin EITC
<!-- meta: state=WI requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = WI` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim Wisconsin's EITC (a percentage of the federal credit, higher for larger families)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, WI credit should also be claimed.

---

## State — Wyoming (WY)

### Federal Sales Tax Deduction
<!-- meta: state=WY requires=deductions.type=itemized -->
- **IF**: `residenceState = WY` AND `deductions.type = itemized`
- **THEN**: Did you deduct general sales taxes on federal Schedule A (WY has no state income tax)?

---

## State — District of Columbia (DC)

### DC EITC (70% of Federal)
<!-- meta: state=DC requires=income.wages>0,income.agi<68000 -->
- **IF**: `residenceState = DC` AND `income.wages > 0` AND `income.agi < 68000`
- **THEN**: Did you claim DC's EITC equal to 70% of the federal credit — one of the highest match rates in the country (refundable, Schedule EITC)?
- **Rule**: Trigger on earned income and EITC income range. If federal EITC eligibility is confirmed, DC credit should also be claimed.

### Homeowner / Renter Property Tax Credit — Schedule H
<!-- meta: state=DC requires=income.agi<87100 -->
- **IF**: `residenceState = DC` AND `income.agi < 87100`
- **THEN**: Did you file DC Schedule H for the income tax credit (up to $1,375) on your DC-40? Renters also qualify.

### Senior / Disabled Property Tax Reduction (50%)
<!-- meta: state=DC requires=taxpayer.isAge65OrOlder=true,income.agi<159750 -->
- **IF**: `residenceState = DC` AND `taxpayer.isAge65OrOlder = true` AND `income.agi < 159750`
- **THEN**: Did you apply with the DC Office of Tax and Revenue for the 50% senior property tax reduction?

---

## Federal — Retirement

### Roth Conversion — Pro-Rata Rule (Form 8606)
<!-- meta: state=ALL requires=retirement.rothIraContributions>0||retirement.iraDistributions>0 -->
- **IF**: notes indicate a Roth IRA conversion, "Backdoor Roth" strategy, or `income.taxableIRADistributions > 0`
- **THEN**: Was the taxable portion of the Roth conversion correctly calculated using the pro-rata rule on Form 8606?
- **Rule**: Under IRC §408, a taxpayer cannot selectively convert only their non-deductible (after-tax) IRA basis — the IRS requires all traditional IRA assets (across all accounts: Traditional, SEP, SIMPLE) to be treated as a single pool for conversion purposes. The taxable fraction is: (total pre-tax IRA balance) ÷ (total IRA balance including non-deductible contributions). Example: if a taxpayer contributes $7,000 non-deductible to a new IRA and converts it to Roth, but also holds $63,000 in a rollover IRA, only 10% of the conversion ($700) is tax-free — the remaining $6,300 is taxable ordinary income, even though the taxpayer intended a "clean" backdoor Roth. Common errors: (1) Form 8606 is absent entirely — mark **possible_underpayment**; (2) the conversion is reported as $0 taxable, but a pre-tax rollover IRA, SEP IRA, or SIMPLE IRA exists — the pro-rata rule applies and tax is likely owed; (3) the taxpayer reports the full conversion as taxable when non-deductible basis exists — mark **possible_overpayment**. If a Roth conversion is present and the taxpayer has other pre-tax IRA balances but the taxable amount appears to be $0 or equal to the full conversion, mark **needs_more_info** to verify all IRA balances and Form 8606 Part II.

### IRA / 401(k) — Early Withdrawal Penalty and Exceptions (IRC §72(t))
<!-- meta: state=ALL requires=retirement.iraDistributions>0 -->
- **IF**: `income.taxableIRADistributions > 0` OR notes indicate a retirement account withdrawal AND the taxpayer is under age 59½
- **THEN**: Was the 10% early withdrawal penalty applied, and if so, does the taxpayer qualify for any §72(t) exception?
- **Rule**: Distributions from traditional IRAs and 401(k)s before age 59½ are subject to a 10% penalty tax in addition to ordinary income tax, reported on Form 5329. However, numerous exceptions eliminate the penalty: (1) substantially equal periodic payments (SEPP/72(t) election); (2) separation from service at age 55 or older (401k only); (3) disability; (4) death; (5) medical expenses exceeding 7.5% of AGI; (6) health insurance premiums while unemployed; (7) qualified first-time home purchase (IRA only, $10,000 lifetime limit); (8) qualified higher education expenses (IRA only); (9) birth or adoption ($5,000, reinstated under SECURE 2.0); (10) domestic abuse survivor exception (new under SECURE 2.0). If an early distribution is present and the 10% penalty was applied, verify whether any exception applies — mark **possible_overpayment** if an exception is likely met. If no penalty was reported on an early distribution and no clear exception is noted, mark **possible_underpayment**.

---

## Federal — Compliance & Reporting

These checks do not affect the tax amount directly but flag reporting obligations with severe penalties for non-compliance.

### FBAR / FATCA — Foreign Account Reporting
<!-- meta: state=ALL requires=income.foreignTaxPaid>0||income.foreignDividends>0 -->
- **IF**: `income.foreignTaxPaid > 0` OR `income.foreignDividends > 0` OR notes indicate foreign bank accounts, foreign investments, or foreign financial assets
- **THEN**: Do you have foreign financial accounts with an aggregate value exceeding $10,000 at any point during the year? If so, FinCEN Form 114 (FBAR) must be filed separately with FinCEN by April 15 (auto-extended to October 15). Additionally, if foreign financial assets exceed $50,000 ($100,000 MFJ) at year-end or $75,000 ($150,000 MFJ) at any point during the year, Form 8938 must be attached to your tax return (FATCA).
- **Rule**: FBAR and FATCA are separate, overlapping requirements. FBAR (FinCEN 114) is filed electronically via BSA E-Filing — it is NOT attached to the tax return. The penalty for willful failure to file FBAR is the greater of $100,000 or 50% of the account balance per violation. Non-willful penalties are up to $10,000 per year per account. FATCA (Form 8938) IS attached to the tax return and has lower thresholds for expats. Foreign accounts include: bank accounts, brokerage accounts, mutual funds, foreign pension plans, and foreign life insurance with cash value. Foreign dividends or foreign tax credits on a 1099-DIV are a reliable indicator that foreign financial accounts may be held. Always mark **needs_more_info** — the taxpayer must confirm aggregate balance thresholds. Do not mark **pass** based on return data alone; the filing obligation depends on account balances not reported on the return.

---

## Federal — Audit Risk (Informational)

These checks do not indicate errors in the return. They identify patterns that the IRS's automated scoring systems are known to flag, so the taxpayer can prepare documentation proactively.

### High Deduction-to-Income Ratio (DIF Score Risk)
<!-- meta: state=ALL requires=deductions.type=itemized -->
- **IF**: `deductions.type = itemized` AND `(deductions.itemizedDeductions.totalItemized / income.agi) > 0.35`
- **THEN**: **[INFO]** Your total itemized deductions exceed 35% of your AGI, which may elevate your IRS audit risk score.
- **Rule**: The IRS uses a proprietary scoring model called the Discriminant Inventory Function (DIF) to rank returns for audit selection. Returns with itemized deductions that are large relative to income are a known DIF trigger — the IRS publishes general deduction "norms" by income bracket and flags outliers. A deduction-to-AGI ratio above 35% is a widely-cited rule of thumb for elevated risk; ratios above 50% are considered high risk. This does not mean the deductions are wrong — if they are legitimate and well-documented, the taxpayer should keep them. However, the taxpayer should: (1) retain all receipts, bank statements, and acknowledgment letters for charitable contributions; (2) retain medical bills and EOBs for medical deductions; (3) ensure charitable contributions over $250 have written acknowledgment from the charity; (4) ensure non-cash charitable contributions over $500 are reported on Form 8283. Always mark **needs_more_info** — inform the user of the elevated ratio and advise documentation readiness, but do not suggest reducing legitimate deductions.

### Large Charitable Deduction Relative to Income
<!-- meta: state=ALL requires=deductions.type=itemized -->
- **IF**: `deductions.type = itemized` AND charitable contributions are present AND `(deductions.itemizedDeductions.charitableGifts / income.agi) > 0.20`
- **THEN**: **[INFO]** Charitable deductions exceed 20% of AGI — a pattern the IRS specifically monitors.
- **Rule**: Charitable contribution deductions exceeding roughly 20% of AGI are a documented IRS audit trigger. Non-cash contributions (clothing, furniture, vehicles) are particularly scrutinized. Verify: (1) cash contributions over $250 have written acknowledgment; (2) non-cash contributions over $500 use Form 8283; (3) non-cash contributions over $5,000 (other than publicly traded securities) require a qualified appraisal; (4) vehicle donations require Form 1098-C from the charity. Donor-Advised Fund (DAF) contributions are legitimate and commonly large relative to income in high-income years — note whether a DAF was used. Mark **needs_more_info** with a reminder to confirm documentation is in order.

---

## Federal — Starting 2026 (Not Applicable for 2025 Returns)

### PMI Deduction *(2026+)*
<!-- meta: state=ALL taxYear=>=2026 -->
- The mortgage insurance premium deduction was reinstated under OBBBA but applies starting with **tax year 2026** only. Do not claim on 2025 returns.

### Above-the-Line Charitable Deduction *(2026+)*
<!-- meta: state=ALL taxYear=>=2026 -->
- The $1,000 (single) / $2,000 (MFJ) non-itemizer charitable deduction applies starting with **tax year 2026** only. There is no above-the-line charitable deduction for non-itemizers on 2025 returns.
