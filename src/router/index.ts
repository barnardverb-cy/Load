import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { resolveAuthRedirect } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'daily',
          name: 'daily-log',
          component: () => import('@/views/DailyLogView.vue'),
        },
        {
          path: 'check-ins',
          name: 'weekly-check-in',
          component: () => import('@/views/WeeklyCheckInView.vue'),
        },
        {
          path: 'exercises',
          name: 'exercises',
          component: () => import('@/views/ExercisesView.vue'),
        },
        {
          path: 'programs',
          name: 'programs',
          component: () => import('@/views/TemplatesView.vue'),
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/views/WorkoutHistoryView.vue'),
        },
        {
          path: 'programs/:id',
          name: 'program-editor',
          component: () => import('@/views/TemplateEditorView.vue'),
        },
        {
          path: 'workouts/:id',
          name: 'active-workout',
          component: () => import('@/views/ActiveWorkoutView.vue'),
        },
        {
          path: 'workouts/:id/summary',
          name: 'workout-summary',
          component: () => import('@/views/WorkoutSummaryView.vue'),
        },
        { path: 'templates', redirect: '/programs' },
        {
          path: 'templates/:id',
          redirect: (to) => `/programs/${String(to.params.id)}`,
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { publicOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { publicOnly: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { publicOnly: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initialize()

  return resolveAuthRedirect(
    {
      requiresAuth: Boolean(to.meta.requiresAuth),
      publicOnly: Boolean(to.meta.publicOnly),
    },
    auth.isAuthenticated,
    to.fullPath,
  )
})

export default router
