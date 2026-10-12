import React, { useState } from 'react';
import Card from '../common/Card';
import { generateHeatmapGrid } from '../../services/analyticsEngine';

export default function CalendarHeatmap({
  sessions = [],
  plannedRestDates = [],
  onSelectDate,
  selectedDate,
}) {
  const cells = generateHeatmapGrid(sessions, 16, plannedRestDates);
  const [hoveredCell, setHoveredCell] = useState(null);

  const getIntensityClass = (intensity, isRest) => {
    switch (intensity) {
      case 4:
        return 'bg-lilac-700 dark:bg-lavender-400';
      case 3:
        return 'bg-lilac-500 dark:bg-lilac-500';
      case 2:
        return 'bg-lilac-300 dark:bg-lilac-700';
      case 1:
        return 'bg-lilac-200/80 dark:bg-lilac-900/60';
      default:
        return isRest
          ? 'bg-cream-100 dark:bg-charcoal-850 border border-dashed border-cream-300 dark:border-charcoal-700'
          : 'bg-cream-200/70 dark:bg-charcoal-800';
    }
  };

  return (
    <Card className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-cream-200 dark:border-charcoal-750">
        <div>
          <h4 className="font-serif text-base font-medium text-espresso-900 dark:text-cream-50">
            Study Consistency Heatmap (16 Weeks)
          </h4>
          <p className="text-xs text-espresso-500 dark:text-cream-400">
            Click any cell to filter sessions for that calendar day
          </p>
        </div>

        {hoveredCell ? (
          <span className="text-xs font-mono px-2 py-1 rounded bg-cream-100 dark:bg-charcoal-800 text-espresso-700 dark:text-cream-200">
            {hoveredCell.date}: {hoveredCell.minutes}m studied {hoveredCell.isRest ? '(Planned Rest)' : ''}
          </span>
        ) : (
          <span className="text-xs font-mono text-espresso-400 dark:text-cream-400">
            Planned rest days exempted
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px] flex gap-2 items-end">
          <div className="flex flex-col justify-between py-0.5 text-[10px] font-mono text-espresso-400 dark:text-cream-400 h-[106px]">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
            <span>Sun</span>
          </div>

          <div className="grid grid-flow-col grid-rows-7 gap-1.5 flex-1">
            {cells.map((cell) => {
              const isSelected = selectedDate === cell.date;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => onSelectDate && onSelectDate(cell.date === selectedDate ? null : cell.date)}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={`${cell.date}: ${cell.minutes} mins studied`}
                  className={`w-3.5 h-3.5 rounded-sm transition-all focus:outline-none ${getIntensityClass(
                    cell.intensity,
                    cell.isRest
                  )} ${
                    isSelected ? 'ring-2 ring-lilac-600 dark:ring-lavender-300 scale-125 z-10' : 'hover:scale-110'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-espresso-400 dark:text-cream-400 mt-3 pt-2 border-t border-cream-200/60 dark:border-charcoal-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-cream-400 dark:border-charcoal-600 bg-cream-100 dark:bg-charcoal-850"></span>
            <span>Planned Rest Day</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-cream-200/70 dark:bg-charcoal-800"></div>
            <div className="w-3 h-3 rounded-sm bg-lilac-200/80 dark:bg-lilac-900/60"></div>
            <div className="w-3 h-3 rounded-sm bg-lilac-300 dark:bg-lilac-700"></div>
            <div className="w-3 h-3 rounded-sm bg-lilac-500 dark:bg-lilac-500"></div>
            <div className="w-3 h-3 rounded-sm bg-lilac-700 dark:bg-lavender-400"></div>
            <span>More</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
