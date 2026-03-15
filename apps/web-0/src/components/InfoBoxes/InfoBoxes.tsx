import React from 'react';
import { INDIANA_LIDAR_INFO, LIDAR_SOURCE_INFO } from '../../utils/constants';

export const InfoBoxes: React.FC = () => {
    return (
        <div className="space-y-3">
            {/* Indiana LiDAR Reference */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                        <p className="font-medium text-blue-900">{INDIANA_LIDAR_INFO.title}</p>
                        {INDIANA_LIDAR_INFO.references.map((ref, index) => (
                            <p key={index} className="text-sm text-blue-700 mt-1">
                                {ref.name} = {ref.epsg}
                            </p>
                        ))}
                    </div>
                </div>
            </div>

            {/* LiDAR Data Source */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 4a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                        <p className="font-medium text-green-900">{LIDAR_SOURCE_INFO.title}</p>
                        <p className="text-sm text-green-700 mt-1">{LIDAR_SOURCE_INFO.description}</p>
                        <a
                            href={LIDAR_SOURCE_INFO.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-green-700 hover:text-green-900"
                        >
                            Visit LiDAR Source
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
