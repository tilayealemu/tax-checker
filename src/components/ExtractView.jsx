import React from 'react'

function fmt(val) {
  if (val === null || val === undefined || val === 0) return '—'
  if (typeof val === 'number') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
  }
  return String(val)
}

function HeroMetric({ label, value, color }) {
  const colorClass = color === 'green' ? 'text-emerald-600' : color === 'red' ? 'text-red-600' : 'text-gray-900'
  return (
    <div className="card text-center py-4">
      <div className={`text-xl font-bold tracking-tight ${colorClass}`}>{fmt(value)}</div>
      <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card space-y-2">
      <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-100 pb-1.5">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className={`flex justify-between items-baseline gap-4 ${highlight ? 'text-gray-900 font-semibold' : ''}`}>
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-xs ${highlight ? 'text-sky-600' : 'text-gray-700'}`}>{fmt(value)}</span>
    </div>
  )
}

export default function ExtractView({ data, files, fileMetadata }) {
  if (!data) return null

  const d = data
  const agi = d.income?.agi
  const totalTax = d.tax?.totalTax
  const refund = d.result?.refund
  const amountOwed = d.result?.amountOwed
  const hasRefund = (refund || 0) > 0
  const hasOwed = (amountOwed || 0) > 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <HeroMetric label="Adjusted Gross Income" value={agi} />
        <HeroMetric label="Total Tax" value={totalTax} />
        <HeroMetric
          label={hasRefund ? 'Refund' : 'Amount Owed'}
          value={hasRefund ? refund : amountOwed}
          color={hasRefund ? 'green' : hasOwed ? 'red' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Filing Info */}
        <Section title="Filing Information">
          <Row label="Tax Year" value={d.taxYear} />
          <Row label="Filing Status" value={d.filingStatus} />
          <Row label="Taxpayer" value={d.taxpayer?.name} />
          {d.spouse?.name && <Row label="Spouse" value={d.spouse.name} />}
          {d.dependents?.length > 0 && (
            <Row label="Dependents" value={d.dependents.map(dep => dep.name).join(', ')} />
          )}
          {d.schedules?.length > 0 && (
            <Row label="Schedules" value={d.schedules.join(', ')} />
          )}
        </Section>

        {/* Income */}
        <Section title="Income">
          {d.income?.wages > 0 && <Row label="Wages & Salary" value={d.income.wages} />}
          {d.income?.taxableInterest > 0 && <Row label="Taxable Interest" value={d.income.taxableInterest} />}
          {d.income?.ordinaryDividends > 0 && <Row label="Dividends" value={d.income.ordinaryDividends} />}
          {d.income?.capitalGainsOrLoss !== 0 && d.income?.capitalGainsOrLoss !== undefined && (
            <Row label="Capital Gains/Loss" value={d.income.capitalGainsOrLoss} />
          )}
          {d.income?.socialSecurityBenefits > 0 && <Row label="Social Security" value={d.income.socialSecurityBenefits} />}
          {d.income?.otherIncome > 0 && <Row label="Other Income" value={d.income.otherIncome} />}
          <Row label="Total Income" value={d.income?.totalIncome} highlight />
          {d.income?.adjustments > 0 && <Row label="Adjustments" value={-d.income.adjustments} />}
          <Row label="Adjusted Gross Income" value={d.income?.agi} highlight />
        </Section>

        {/* Deductions */}
        <Section title="Deductions">
          <Row label="Deduction Type" value={d.deductions?.type === 'itemized' ? 'Itemized' : 'Standard'} />
          {d.deductions?.type === 'standard' && (
            <Row label="Standard Deduction" value={d.deductions.standardDeductionAmount} />
          )}
          {d.deductions?.type === 'itemized' && d.deductions.itemizedDeductions && (
            <>
              {d.deductions.itemizedDeductions.totalSaltDeduction > 0 && <Row label="SALT" value={d.deductions.itemizedDeductions.totalSaltDeduction} />}
              {d.deductions.itemizedDeductions.mortgageInterest > 0 && <Row label="Mortgage Interest" value={d.deductions.itemizedDeductions.mortgageInterest} />}
              {d.deductions.itemizedDeductions.charitableGifts > 0 && <Row label="Charitable Gifts" value={d.deductions.itemizedDeductions.charitableGifts} />}
              {d.deductions.itemizedDeductions.medicalAndDental > 0 && <Row label="Medical & Dental" value={d.deductions.itemizedDeductions.medicalAndDental} />}
              <Row label="Total Itemized" value={d.deductions.itemizedDeductions.totalItemized} />
            </>
          )}
          {d.deductions?.qualifiedBusinessIncome > 0 && <Row label="QBI Deduction" value={d.deductions.qualifiedBusinessIncome} />}
          <Row label="Taxable Income" value={d.deductions?.taxableIncome} highlight />
        </Section>

        {/* Tax & Credits */}
        <Section title="Tax & Credits">
          <Row label="Income Tax" value={d.tax?.incomeTax} />
          {d.tax?.alternativeMinimumTax > 0 && <Row label="AMT" value={d.tax.alternativeMinimumTax} />}
          {d.tax?.netInvestmentIncomeTax > 0 && <Row label="Net Investment Income Tax" value={d.tax.netInvestmentIncomeTax} />}
          {d.tax?.additionalMedicareTax > 0 && <Row label="Additional Medicare Tax" value={d.tax.additionalMedicareTax} />}
          {d.tax?.selfEmploymentTax > 0 && <Row label="Self-Employment Tax" value={d.tax.selfEmploymentTax} />}
          {d.tax?.otherTaxes > 0 && <Row label="Other Taxes" value={d.tax.otherTaxes} />}
          <Row label="Total Tax" value={d.tax?.totalTax} highlight />
          {d.credits?.foreignTaxCredit > 0 && <Row label="Foreign Tax Credit" value={-d.credits.foreignTaxCredit} />}
          {d.credits?.childTaxCredit > 0 && <Row label="Child Tax Credit" value={-d.credits.childTaxCredit} />}
          {d.credits?.earnedIncomeCredit > 0 && <Row label="Earned Income Credit" value={-d.credits.earnedIncomeCredit} />}
          {d.credits?.educationCredits > 0 && <Row label="Education Credits" value={-d.credits.educationCredits} />}
          {d.credits?.otherCredits > 0 && <Row label="Other Credits" value={-d.credits.otherCredits} />}
          {d.credits?.totalCredits > 0 && <Row label="Total Credits" value={-d.credits.totalCredits} />}
        </Section>

        {/* Payments & Result */}
        <Section title="Payments & Result">
          {d.payments?.federalWithheld > 0 && <Row label="Federal Withholding" value={d.payments.federalWithheld} />}
          {d.payments?.estimatedTaxPayments > 0 && <Row label="Estimated Payments" value={d.payments.estimatedTaxPayments} />}
          <Row label="Total Payments" value={d.payments?.totalPayments} />
          <div className="border-t border-gray-100 pt-1.5 mt-1.5">
            {(d.result?.refund || 0) > 0 && <Row label="Refund" value={d.result.refund} highlight />}
            {(d.result?.amountOwed || 0) > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500 text-xs">Amount Owed</span>
                <span className="text-red-600 text-xs font-semibold">{fmt(d.result.amountOwed)}</span>
              </div>
            )}
            {d.result?.effectiveTaxRate > 0 && <Row label="Effective Tax Rate" value={`${d.result.effectiveTaxRate.toFixed(1)}%`} />}
            {d.result?.marginalTaxRate > 0 && <Row label="Marginal Tax Rate" value={`${d.result.marginalTaxRate}%`} />}
          </div>
        </Section>

        {/* Files */}
        {files?.length > 0 && (
          <div className="lg:col-span-2">
            <Section title="Files">
              <div className="space-y-2">
                {files.map((filename, i) => {
                  const meta = fileMetadata?.[filename]
                  const stem = filename.replace(/\.[^.]+$/, '')
                  const parsedName = meta?.convertedToText ? `${stem}-auto-generated.txt` : null
                  return (
                    <div key={i} className="flex justify-between items-start gap-4 py-1 border-b border-gray-50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-700 truncate font-medium">{filename}</div>
                        {parsedName && (
                          <div className="text-xs text-gray-400 truncate mt-0.5">parsed to {parsedName}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 text-right shrink-0">
                        {meta?.formType && meta?.formCode
                          ? `${meta.formType} ${meta.formCode}`
                          : meta?.formType && meta?.formDescription
                          ? `${meta.formType}: ${meta.formDescription}`
                          : meta?.formType || '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          </div>
        )}

        {/* Notes */}
        {d.notes && (
          <div className="lg:col-span-2">
            <Section title="Notes">
              <div className="space-y-2">
                {d.notes.split(/\n\n+/).map((para, i) => (
                  <p key={i} className="text-xs text-gray-600 leading-relaxed">{para}</p>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}
