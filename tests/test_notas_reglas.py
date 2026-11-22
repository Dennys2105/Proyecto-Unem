import unittest

from app.service.notas_reglas import nota_minima_aprobatoria


class NotaMinimaAprobatoriaTests(unittest.TestCase):
    def test_regular_eje_uses_twelve(self):
        self.assertEqual(nota_minima_aprobatoria("Socio-Crítico"), 12)

    def test_proyecto_eje_uses_sixteen_case_insensitively(self):
        self.assertEqual(nota_minima_aprobatoria("  PROYECTO "), 16)

    def test_missing_axis_uses_regular_minimum(self):
        self.assertEqual(nota_minima_aprobatoria(None), 12)


if __name__ == "__main__":
    unittest.main()
