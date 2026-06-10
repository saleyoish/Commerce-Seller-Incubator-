'use client';

import { useEffect, useState } from 'react';
import { createClientSideSupabase, type SellerRanking } from '@/lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Trophy,
  Medal,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  Target,
  Flame,
  Crown,
  Star,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

const TIME_PERIODS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

const BADGES = [
  { id: 'top_seller', name: '🏆 Top Seller', color: 'bg-yellow-100 text-yellow-800', icon: Trophy },
  { id: 'most_shows', name: '🔥 Most Shows', color: 'bg-orange-100 text-orange-800', icon: Flame },
  { id: 'best_engagement', name: '⭐ Best Engagement', color: 'bg-purple-100 text-purple-800', icon: Star },
  { id: 'rising_star', name: '🚀 Rising Star', color: 'bg-blue-100 text-blue-800', icon: ArrowUpRight },
];

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<SellerRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('month');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRankings();
  }, [timePeriod]);

  const loadRankings = async () => {
    try {
      const supabase = createClientSideSupabase();

      // For now, query from the materialized view (all time)
      // In production, you'd have separate queries for week/month
      const { data, error } = await supabase
        .from('seller_rankings')
        .select('*')
        .limit(50);

      if (error) throw error;
      setRankings(data || []);
    } catch (error) {
      console.error('Error loading rankings:', error);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center font-semibold text-gray-500">{rank}</span>;
    }
  };

  const getSellerBadges = (rank: number, totalShows: number, avgSale: number) => {
    const badges = [];
    if (rank === 1) badges.push(BADGES[0]);
    if (totalShows > 20) badges.push(BADGES[1]);
    if (avgSale > 100) badges.push(BADGES[2]);
    if (rank <= 10 && totalShows < 10) badges.push(BADGES[3]);
    return badges;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Seller Leaderboard</h1>
          <p className="text-xl text-blue-100">Top performers across all platforms</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-8">
        {/* Time Period Selector */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex justify-center gap-2">
              {TIME_PERIODS.map((period) => (
                <Button
                  key={period.value}
                  variant={timePeriod === period.value ? 'default' : 'outline'}
                  onClick={() => setTimePeriod(period.value)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {period.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Podium */}
        {rankings.length >= 3 && (
          <div className="mb-12">
            <div className="flex items-end justify-center gap-4 mb-8">
              {/* 2nd Place */}
              <div className="text-center">
                <div className="bg-gray-200 rounded-t-lg p-4 w-32">
                  <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-semibold truncate">{rankings[1].seller_name || rankings[1].email}</p>
                  <p className="text-sm text-gray-600">${rankings[1].total_sales?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-300 h-24 rounded-b-lg" />
              </div>

              {/* 1st Place */}
              <div className="text-center">
                <div className="bg-yellow-100 rounded-t-lg p-4 w-40 border-2 border-yellow-400">
                  <Crown className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <p className="font-bold truncate">{rankings[0].seller_name || rankings[0].email}</p>
                  <p className="text-lg font-bold text-yellow-700">${rankings[0].total_sales?.toLocaleString()}</p>
                  <div className="flex justify-center gap-1 mt-2">
                    {getSellerBadges(1, rankings[0].total_shows || 0, rankings[0].avg_sale_amount || 0).map((badge) => (
                      <span key={badge.id} title={badge.name}>
                        {badge.name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-yellow-400 h-32 rounded-b-lg" />
              </div>

              {/* 3rd Place */}
              <div className="text-center">
                <div className="bg-orange-100 rounded-t-lg p-4 w-32">
                  <Medal className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-semibold truncate">{rankings[2].seller_name || rankings[2].email}</p>
                  <p className="text-sm text-orange-600">${rankings[2].total_sales?.toLocaleString()}</p>
                </div>
                <div className="bg-orange-300 h-16 rounded-b-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Full Rankings
            </CardTitle>
            <CardDescription>
              {rankings.length} sellers ranked by total sales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Seller</th>
                    <th className="text-right py-3 px-4 text-sm font-medium">
                      <DollarSign className="w-4 h-4 inline" />
                      Total Sales
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium">
                      <Target className="w-4 h-4 inline" />
                      Shows
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium">Avg/Show</th>
                    <th className="text-center py-3 px-4 text-sm font-medium">Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((seller) => (
                    <tr 
                      key={seller.seller_id} 
                      className={`border-b hover:bg-gray-50 ${
                        seller.rank <= 3 ? 'bg-yellow-50/50' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getRankIcon(seller.rank)}
                          {seller.rank === 1 && (
                            <Badge className="bg-yellow-500 text-white">1st</Badge>
                          )}
                          {seller.rank === 2 && (
                            <Badge className="bg-gray-400 text-white">2nd</Badge>
                          )}
                          {seller.rank === 3 && (
                            <Badge className="bg-orange-600 text-white">3rd</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">
                            {seller.seller_name || seller.email}
                          </p>
                          {seller.last_sale_date && (
                            <p className="text-xs text-gray-500">
                              Last sale: {new Date(seller.last_sale_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-bold text-green-600">
                          ${(seller.total_sales || 0).toLocaleString()}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium">{seller.total_shows || 0}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="text-sm">
                          ${(seller.avg_sale_amount || 0).toFixed(0)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center gap-1">
                          {getSellerBadges(
                            seller.rank, 
                            seller.total_shows || 0, 
                            seller.avg_sale_amount || 0
                          ).map((badge) => (
                            <span 
                              key={badge.id} 
                              className={`px-2 py-1 rounded-full text-xs ${badge.color}`}
                              title={badge.name}
                            >
                              {badge.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rankings.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No rankings available yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start selling to appear on the leaderboard!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Want to join the leaderboard?</h3>
                <p className="text-sm text-gray-600">
                  Connect your platforms and start streaming to grow your sales!
                </p>
              </div>
              <Link href="/signup">
                <Button>
                  Become a Seller
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
