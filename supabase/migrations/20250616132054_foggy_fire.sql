-- Vista de análisis de asistencia por grupo
CREATE OR REPLACE VIEW attendance_by_group AS
WITH attendance_summary AS (
  SELECT
    s.group_section,
    a.date,
    COUNT(DISTINCT (ar.value->>'scout_id')::uuid) AS attendees,
    COUNT(DISTINCT s.id) AS total_members
  FROM attendance a
  CROSS JOIN LATERAL jsonb_array_elements(a.records) AS ar
  JOIN scouts s ON (ar.value->>'scout_id')::uuid = s.id
  WHERE a.date >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY s.group_section, a.date
)
SELECT
  group_section,
  COUNT(DISTINCT date) AS meeting_count,
  AVG(attendees) AS avg_attendance,
  AVG(COALESCE(attendees::float / NULLIF(total_members, 0), 0)) * 100 AS avg_attendance_percentage
FROM attendance_summary
GROUP BY group_section
ORDER BY avg_attendance_percentage DESC;

-- Vista de miembros inactivos
CREATE OR REPLACE VIEW inactive_members AS
SELECT
  s.id,
  s.name,
  s.group_section,
  MAX(a.date) AS last_attendance,
  CURRENT_DATE - MAX(a.date)::date AS days_since_last_attendance
FROM scouts s
LEFT JOIN attendance a ON a.group_section = s.group_section
LEFT JOIN LATERAL jsonb_array_elements(a.records) AS ar ON (ar.value->>'scout_id')::uuid = s.id
WHERE s.status = 'activo'
GROUP BY s.id, s.name, s.group_section
HAVING MAX(a.date) IS NULL OR MAX(a.date) < CURRENT_DATE - INTERVAL '3 months'
ORDER BY last_attendance ASC NULLS FIRST;