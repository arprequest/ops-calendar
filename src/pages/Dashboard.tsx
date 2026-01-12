import { useCalendarStore } from '../stores/calendarStore'
import DailyView from '../components/calendar/DailyView'
import WeeklyView from '../components/calendar/WeeklyView'
import MonthlyView from '../components/calendar/MonthlyView'
import YearlyView from '../components/calendar/YearlyView'

export default function DashboardPage() {
  const { view } = useCalendarStore()

  switch (view) {
    case 'daily':
      return <DailyView />
    case 'weekly':
      return <WeeklyView />
    case 'monthly':
      return <MonthlyView />
    case 'yearly':
      return <YearlyView />
  }
}
