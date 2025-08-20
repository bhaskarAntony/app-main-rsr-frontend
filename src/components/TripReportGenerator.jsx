import React, { useState } from 'react';
import { Download, FileText, Table, Eye, Calendar, MapPin, Clock, User, Car } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function TripReportGenerator({ trip, onClose }) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('detailed');

  const generatePDFReport = async () => {
    setLoading(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(41, 128, 185);
      pdf.text('RSR Tours & Travels', pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Trip Report', pageWidth / 2, 35, { align: 'center' });
      
      // Trip Details
      let yPosition = 55;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Trip Information:', 20, yPosition);
      
      yPosition += 10;
      pdf.setFont(undefined, 'normal');
      pdf.text(`Trip Name: ${trip.tripName}`, 20, yPosition);
      
      yPosition += 8;
      pdf.text(`Date: ${new Date(trip.scheduledDate).toLocaleDateString()}`, 20, yPosition);
      
      yPosition += 8;
      pdf.text(`Start Time: ${trip.scheduledStartTime}`, 20, yPosition);
      
      yPosition += 8;
      pdf.text(`End Time: ${trip.scheduledEndTime || 'N/A'}`, 20, yPosition);
      
      yPosition += 8;
      pdf.text(`Status: ${trip.status}`, 20, yPosition);
      
      yPosition += 8;
      pdf.text(`Total Distance: ${trip.totalDistance || 0} km`, 20, yPosition);
      
      // Driver Details
      yPosition += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('Driver Information:', 20, yPosition);
      
      yPosition += 10;
      pdf.setFont(undefined, 'normal');
      pdf.text(`Name: ${trip.driverId?.name || 'N/A'}`, 20, yPosition);
      
      yPosition += 8;
      pdf.text(`Email: ${trip.driverId?.email || 'N/A'}`, 20, yPosition);
      
      // Vehicle Details
      yPosition += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('Vehicle Information:', 20, yPosition);
      
      yPosition += 10;
      pdf.setFont(undefined, 'normal');
      pdf.text(`Vehicle: ${trip.vehicleId?.name || 'N/A'}`, 20, yPosition);
      
      yPosition += 8;
      pdf.text(`Number Plate: ${trip.vehicleId?.numberPlate || 'N/A'}`, 20, yPosition);
      
      // Employee Details
      yPosition += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('Employee Details:', 20, yPosition);
      
      trip.employees.forEach((emp, index) => {
        yPosition += 15;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFont(undefined, 'bold');
        pdf.text(`Employee ${index + 1}:`, 20, yPosition);
        
        yPosition += 8;
        pdf.setFont(undefined, 'normal');
        pdf.text(`Name: ${emp.employeeId?.name || 'N/A'}`, 25, yPosition);
        
        yPosition += 6;
        pdf.text(`Pickup: ${emp.pickupLocation?.address || 'N/A'}`, 25, yPosition);
        
        yPosition += 6;
        pdf.text(`Drop: ${emp.dropLocation?.address || 'N/A'}`, 25, yPosition);
        
        yPosition += 6;
        pdf.text(`Status: ${emp.status}`, 25, yPosition);
        
        if (emp.pickupTime) {
          yPosition += 6;
          pdf.text(`Pickup Time: ${new Date(emp.pickupTime).toLocaleString()}`, 25, yPosition);
        }
        
        if (emp.dropTime) {
          yPosition += 6;
          pdf.text(`Drop Time: ${new Date(emp.dropTime).toLocaleString()}`, 25, yPosition);
        }
      });
      
      // Footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Generated on ${new Date().toLocaleString()}`, 20, pdf.internal.pageSize.height - 10);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pdf.internal.pageSize.height - 10);
      }
      
      pdf.save(`trip-report-${trip.tripName}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateExcelReport = () => {
    setLoading(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      // Trip Summary Sheet
      const tripData = [
        ['RSR Tours & Travels - Trip Report'],
        [''],
        ['Trip Information'],
        ['Trip Name', trip.tripName],
        ['Date', new Date(trip.scheduledDate).toLocaleDateString()],
        ['Start Time', trip.scheduledStartTime],
        ['End Time', trip.scheduledEndTime || 'N/A'],
        ['Status', trip.status],
        ['Total Distance', `${trip.totalDistance || 0} km`],
        [''],
        ['Driver Information'],
        ['Name', trip.driverId?.name || 'N/A'],
        ['Email', trip.driverId?.email || 'N/A'],
        [''],
        ['Vehicle Information'],
        ['Vehicle', trip.vehicleId?.name || 'N/A'],
        ['Number Plate', trip.vehicleId?.numberPlate || 'N/A']
      ];
      
      const tripSheet = XLSX.utils.aoa_to_sheet(tripData);
      XLSX.utils.book_append_sheet(workbook, tripSheet, 'Trip Summary');
      
      // Employee Details Sheet
      const employeeData = [
        ['Employee Name', 'Pickup Location', 'Drop Location', 'Status', 'Pickup Time', 'Drop Time']
      ];
      
      trip.employees.forEach(emp => {
        employeeData.push([
          emp.employeeId?.name || 'N/A',
          emp.pickupLocation?.address || 'N/A',
          emp.dropLocation?.address || 'N/A',
          emp.status,
          emp.pickupTime ? new Date(emp.pickupTime).toLocaleString() : 'N/A',
          emp.dropTime ? new Date(emp.dropTime).toLocaleString() : 'N/A'
        ]);
      });
      
      const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
      XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employee Details');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `trip-report-${trip.tripName}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCSVReport = () => {
    setLoading(true);
    try {
      const csvData = [
        ['RSR Tours & Travels - Trip Report'],
        [''],
        ['Trip Name', trip.tripName],
        ['Date', new Date(trip.scheduledDate).toLocaleDateString()],
        ['Status', trip.status],
        ['Total Distance', `${trip.totalDistance || 0} km`],
        ['Driver', trip.driverId?.name || 'N/A'],
        ['Vehicle', `${trip.vehicleId?.name || 'N/A'} (${trip.vehicleId?.numberPlate || 'N/A'})`],
        [''],
        ['Employee Details'],
        ['Name', 'Pickup Location', 'Drop Location', 'Status', 'Pickup Time', 'Drop Time']
      ];
      
      trip.employees.forEach(emp => {
        csvData.push([
          emp.employeeId?.name || 'N/A',
          emp.pickupLocation?.address || 'N/A',
          emp.dropLocation?.address || 'N/A',
          emp.status,
          emp.pickupTime ? new Date(emp.pickupTime).toLocaleString() : 'N/A',
          emp.dropTime ? new Date(emp.dropTime).toLocaleString() : 'N/A'
        ]);
      });
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `trip-report-${trip.tripName}-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error generating CSV:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Trip Report</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Trip Preview */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <Car className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{trip.tripName}</h3>
                <p className="text-gray-600">RSR Tours & Travels</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="flex flex-col items-center">
                <Calendar className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-sm font-medium">{new Date(trip.scheduledDate).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col items-center">
                <Clock className="w-5 h-5 text-green-600 mb-1" />
                <span className="text-sm font-medium">{trip.scheduledStartTime}</span>
              </div>
              <div className="flex flex-col items-center">
                <User className="w-5 h-5 text-purple-600 mb-1" />
                <span className="text-sm font-medium">{trip.employees.length} Employees</span>
              </div>
              <div className="flex flex-col items-center">
                <MapPin className="w-5 h-5 text-orange-600 mb-1" />
                <span className="text-sm font-medium">{trip.totalDistance || 0} km</span>
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Download Report</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={generatePDFReport}
                disabled={loading}
                className="flex items-center justify-center space-x-3 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <FileText className="w-6 h-6 text-red-600" />
                <div className="text-left">
                  <p className="font-medium text-red-900">PDF Report</p>
                  <p className="text-sm text-red-600">Detailed format</p>
                </div>
              </button>
              
              <button
                onClick={generateExcelReport}
                disabled={loading}
                className="flex items-center justify-center space-x-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <Table className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-green-900">Excel Report</p>
                  <p className="text-sm text-green-600">Spreadsheet format</p>
                </div>
              </button>
              
              <button
                onClick={generateCSVReport}
                disabled={loading}
                className="flex items-center justify-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-blue-900">CSV Report</p>
                  <p className="text-sm text-blue-600">Data format</p>
                </div>
              </button>
            </div>
          </div>

          {/* Trip Details Preview */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-3">Report Preview</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Driver:</span>
                <span className="font-medium">{trip.driverId?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle:</span>
                <span className="font-medium">{trip.vehicleId?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  trip.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  trip.status === 'In Progress' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {trip.status}
                </span>
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Generating report...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TripReportGenerator;