"use client";

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

interface Holiday {
  name: string;
  date: Date;
}

interface RawAppointmentData {
  'Appointment Date': string;
  'Appointment / Servicing Provider': string;
  'Patient Count': number;
  [key: string]: string | number;
}

interface Appointment extends Record<string, unknown> {
  date: Date;
  provider: string;
  patientCount: number;
}

interface WeekData {
  weekStart: Date;
  appointments: {
    [provider: string]: Appointment[];
  };
  isCurrent: boolean;
}

const ProviderScheduleViewer: React.FC = () => {
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [providers, setProviders] = useState<string[]>([]);

  // Rest of the component stays the same...
  const getHolidays = (year: number): Holiday[] => {
    const holidays: Holiday[] = [
      { name: "New Year's Day", date: new Date(year, 0, 1) },
      // Memorial Day (last Monday in May)
      { name: "Memorial Day", date: (() => {
        const lastMonday = new Date(year, 4, 31);
        while (lastMonday.getDay() !== 1) lastMonday.setDate(lastMonday.getDate() - 1);
        return lastMonday;
      })() },
      { name: "Independence Day", date: new Date(year, 6, 4) },
      // Labor Day (first Monday in September)
      { name: "Labor Day", date: (() => {
        const firstMonday = new Date(year, 8, 1);
        while (firstMonday.getDay() !== 1) firstMonday.setDate(firstMonday.getDate() + 1);
        return firstMonday;
      })() },
      // Thanksgiving (fourth Thursday in November)
      { name: "Thanksgiving", date: (() => {
        const thanksgiving = new Date(year, 10, 1);
        while (thanksgiving.getDay() !== 4) thanksgiving.setDate(thanksgiving.getDate() + 1);
        thanksgiving.setDate(thanksgiving.getDate() + 21);
        return thanksgiving;
      })() },
      { name: "Christmas", date: new Date(year, 11, 25) },
    ];
    return holidays;
  };

  const isHoliday = (date: Date): Holiday | undefined => {
    const holidays = getHolidays(date.getFullYear());
    return holidays.find(holiday => 
      holiday.date.getDate() === date.getDate() &&
      holiday.date.getMonth() === date.getMonth()
    );
  };

  useEffect(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const currentWeekStart = new Date(today);
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(today.getDate() + mondayOffset);
    
    setWeeks([{ 
      weekStart: currentWeekStart,
      appointments: {},
      isCurrent: true
    }]);
  }, []);

  const processCSV = async (file: File) => {
    try {
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      });

      Papa.parse<RawAppointmentData>(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData: Appointment[] = results.data.map(row => ({
            date: new Date(row['Appointment Date']),
            provider: row['Appointment / Servicing Provider'],
            patientCount: row['Patient Count'],
            ...row
          }));

          // Group by week using vanilla JS
          const groupedByWeek = parsedData.reduce((acc: { [key: string]: Appointment[] }, row: Appointment) => {
            const date = new Date(row.date);
            date.setHours(0, 0, 0, 0);
            const day = date.getDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() + mondayOffset);
            const weekKey = startOfWeek.toISOString().split('T')[0];
            
            if (!acc[weekKey]) {
              acc[weekKey] = [];
            }
            acc[weekKey].push(row);
            return acc;
          }, {});

          const uniqueProviders = Array.from(new Set(parsedData.map(row => row.provider))).filter(Boolean);
          
          // Get current week for comparison
          const today = new Date();
          const currentDay = today.getDay();
          const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
          const currentWeekStart = new Date(today);
          currentWeekStart.setDate(today.getDate() + mondayOffset);
          const currentWeekKey = currentWeekStart.toISOString().split('T')[0];

          // Create weekly data structure
          const weeklyData: WeekData[] = Object.entries(groupedByWeek).map(([weekStart, appointments]) => ({
            weekStart: new Date(weekStart),
            appointments: appointments.reduce((acc: { [key: string]: Appointment[] }, app) => {
              if (!acc[app.provider]) {
                acc[app.provider] = [];
              }
              acc[app.provider].push(app);
              return acc;
            }, {}),
            isCurrent: weekStart === currentWeekKey
          }));

          // Sort weeks and find current week index
          const sortedWeeks = weeklyData.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
          const currentWeekIndex = sortedWeeks.findIndex(week => week.isCurrent);
          
          setWeeks(sortedWeeks);
          setProviders(uniqueProviders);
          if (currentWeekIndex !== -1) {
            setCurrentWeekIndex(currentWeekIndex);
          }
        }
      });
    } catch (error) {
      console.error('Error processing CSV:', error);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWeekRange = (weekStart: Date): string => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processCSV(file);
    }
  };

  const currentWeek = weeks[currentWeekIndex] || { weekStart: new Date(), appointments: {}, isCurrent: false };

  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800">Provider Schedule Viewer</h2>
          {currentWeek.isCurrent && (
            <span className="text-sm text-green-600 ml-2">Current Week</span>
          )}
        </div>
        
        <div className="p-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full p-2 mb-4 border rounded text-sm"
          />
          
          {weeks.length > 0 && (
            <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded">
              <button
                className="px-4 py-2 border rounded bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentWeekIndex(prev => Math.max(0, prev - 1))}
                disabled={currentWeekIndex === 0}
              >
                ← Previous
              </button>
              <span className="font-medium text-gray-900">
                {getWeekRange(currentWeek.weekStart)}
              </span>
              <button
                className="px-4 py-2 border rounded bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentWeekIndex(prev => Math.min(weeks.length - 1, prev + 1))}
                disabled={currentWeekIndex === weeks.length - 1}
              >
                Next →
              </button>
            </div>
          )}

          <div className="space-y-4">
            {providers.map(provider => (
              <div key={provider} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-4 border-b">
                  <h3 className="font-semibold text-gray-800">{provider}</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date(currentWeek.weekStart);
                      date.setDate(date.getDate() + i + 1);
                      const dayAppointments = currentWeek.appointments[provider]?.filter(
                        app => {
                          const nextDay = new Date(date);
                          nextDay.setDate(date.getDate()+1);
                          return app.date.toDateString() === nextDay.toDateString();
                        }
                      );
                      const patientCount = dayAppointments?.[0]?.patientCount || 0;
                      const holiday = isHoliday(date);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const isToday = new Date().toDateString() === date.toDateString();

                      return (
                        <div
                          key={i}
                          className={`p-2 text-center border rounded relative ${
                            holiday ? 'bg-gray-200' :
                            isWeekend ? 'bg-gray-100' :
                            patientCount > 0 ? 'bg-blue-50' : 
                            'bg-gray-50'
                          } ${
                            isToday ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-700">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="text-sm text-gray-600">
                            {date.getDate()}
                          </div>
                          <div className="mt-1 font-medium text-gray-900">
                            {holiday ? (
                              <div className="text-xs text-gray-600">{holiday.name}</div>
                            ) : patientCount > 0 ? (
                              `${patientCount} patients`
                            ) : '-'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderScheduleViewer;