'use client'

import { useState, useEffect } from 'react'

interface Facility {
  name: string
  availability: string
  status: 'available' | 'unavailable'
}

interface ApiResponse {
  success: boolean
  date: string
  facilities: Facility[]
  error?: string
}

export default function Home() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('2025-07-08')

  const fetchFacilities = async (date: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/scrape?date=${date}`)
      const data: ApiResponse = await response.json()
      
      if (data.success) {
        setFacilities(data.facilities)
      } else {
        setError(data.error || 'データの取得に失敗しました')
      }
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFacilities(selectedDate)
  }, [selectedDate])

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            刈谷市体育館空き状況チェッカー
          </h1>
          <p className="text-gray-600">
            バドミントン施設の空き状況を確認できます
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label htmlFor="date" className="text-sm font-medium text-gray-700">
                日付:
              </label>
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => fetchFacilities(selectedDate)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '取得中...' : '検索'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">データを取得中...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {facilities.length > 0 ? (
                facilities.map((facility, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      facility.status === 'available'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">
                        {facility.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          facility.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {facility.status === 'available' ? '空きあり' : '空きなし'}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">
                      状況: {facility.availability}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  データが見つかりませんでした
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="text-center text-gray-500 text-sm">
          <p>データは刈谷市スポーツ施設予約システムから取得しています</p>
        </footer>
      </div>
    </div>
  )
}
