import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  static Database? _database;

  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'ponto_offline.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) {
        return db.execute(
          'CREATE TABLE pontos_pendentes(id INTEGER PRIMARY KEY AUTOINCREMENT, image_base64 TEXT, latitude REAL, longitude REAL, device_time TEXT)',
        );
      },
    );
  }

  Future<void> salvarPonto(Map<String, dynamic> ponto) async {
    final db = await database;
    await db.insert('pontos_pendentes', ponto);
  }

  Future<List<Map<String, dynamic>>> buscarPendentes() async {
    final db = await database;
    return await db.query('pontos_pendentes');
  }

  Future<int> contarPendentes() async {
    final db = await database;
    final resultado = await db.rawQuery('SELECT COUNT(*) as total FROM pontos_pendentes');
    return Sqflite.firstIntValue(resultado) ?? 0;
  }

  Future<void> removerPonto(int id) async {
    final db = await database;
    await db.delete('pontos_pendentes', where: 'id = ?', whereArgs: [id]);
  }
}
