'use client'
import React, { useState } from 'react';
import Papa from 'papaparse';

const ProviderScheduleViewer = () => {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [weeks, setWeeks] = useState([]);
  const [providers, setProviders] = useState([]);

  const processCSV = async (file) => {
    try {
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });

      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map(row => ({
            ...row,
            date: new Date(row['Appointment Date']),
            provider: row['Appointment / Servicing Provider'],
            patientCount: row['Patient Count']
          }));

          // Group by week using vanilla JS
          const groupedByWeek = parsedData.reduce((acc, row) => {
            const date = row.date;
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

          // Get unique providers using Set
          const uniqueProviders = Array.from(new Set(parsedData.map(row => row.provider))).filter(Boolean);
          
          // Create weekly data structure
          const weeklyData = Object.entries(groupedByWeek).map(([weekStart, appointments]) => ({
            weekStart: new Date(weekStart),
            appointments: appointments.reduce((acc, app) => {
              if (!acc[app.provider]) {
                acc[app.provider] = [];
              }
              acc[app.provider].push(app);
              return acc;
            }, {})
          }));

          setWeeks(weeklyData.sort((a, b) => a.weekStart - b.weekStart));
          setProviders(uniqueProviders);
        }
      });
    } catch (error) {
      console.error('Error processing CSV:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWeekRange = (weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      processCSV(file);
    }
  };

  const currentWeek = weeks[currentWeekIndex] || { weekStart: new Date(), appointments: {} };

  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800">Provider Schedule Viewer</h2>
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
                      date.setDate(date.getDate() + i);
                      const dayAppointments = currentWeek.appointments[provider]?.filter(
                        app => app.date.toDateString() === date.toDateString()
                      );
                      const patientCount = dayAppointments?.[0]?.patientCount || 0;

                      return (
                        <div
                          key={i}
                          className={`p-2 text-center border rounded ${
                            patientCount > 0 ? 'bg-blue-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-700">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="text-sm text-gray-600">
                            {date.getDate()}
                          </div>
                          <div className="mt-1 font-medium text-gray-900">
                            {patientCount > 0 ? `${patientCount} patients` : '-'}
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