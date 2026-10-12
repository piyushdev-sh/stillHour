import React from 'react';
import Card from '../common/Card';
import Badge from '../common/Badge';

export default function SubjectBarChart({ subjectBreakdown = [] }) {
  if (subjectBreakdown.length === 0) {
    return (
      <Card>
        <h4 className="font-serif text-base font-medium text-espresso-900 dark:text-cream-50 mb-1">
          Subject Time Allocation & Balance
        </h4>
        <p className="text-xs text-espresso-400 dark:text-cream-400 py-6 text-center">
          No subjects defined yet.
        </p>
      </Card>
    );
  }

  const getBalanceBadge = (status) => {
    switch (status) {
      case 'understudied':
        return <Badge variant="medium">Understudied (&lt; 50%)</Badge>;
      case 'overstudied':
        return <Badge variant="low">Overstudied (&gt; 150%)</Badge>;
      default:
        return <Badge variant="in_progress">On Track</Badge>;
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-serif text-base font-medium text-espresso-900 dark:text-cream-50">
          Subject Time Allocation & Balance
        </h4>
        <span className="text-xs font-mono text-espresso-400 dark:text-cream-400">
          Planned vs Actual
        </span>
      </div>
      <p className="text-xs text-espresso-500 dark:text-cream-400 mb-6">
        Detects imbalances relative to configured target pace and subject priority.
      </p>

      <div className="space-y-4">
        {subjectBreakdown.map((item) => {
          const percent = item.plannedPeriodMinutes > 0
            ? Math.min(100, Math.round((item.actualMinutes / item.plannedPeriodMinutes) * 100))
            : 0;

          return (
            <div key={item.subjectId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-espresso-800 dark:text-cream-100">
                    {item.name}
                  </span>
                  <Badge variant={item.priority}>{item.priority.toUpperCase()}</Badge>
                  {getBalanceBadge(item.balanceStatus)}
                </div>

                <div className="font-mono text-espresso-500 dark:text-cream-400">
                  <strong className="text-espresso-800 dark:text-cream-100">{item.actualMinutes}m</strong>
                  {' / '}
                  {item.plannedPeriodMinutes}m ({percent}%)
                </div>
              </div>

              {/* Stacked comparison bar */}
              <div className="w-full bg-cream-200 dark:bg-charcoal-750 h-2.5 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.balanceStatus === 'understudied'
                      ? 'bg-amber-500'
                      : item.balanceStatus === 'overstudied'
                      ? 'bg-sage-600 dark:bg-sage-500'
                      : 'bg-lilac-600 dark:bg-lilac-500'
                  }`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
