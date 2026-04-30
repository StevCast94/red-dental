import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function test() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash created:', hash.substring(0,20) + '...');
  const valid = await bcrypt.compare(password, hash);
  console.log('Password valid:', valid);
  
  const token = jwt.sign({ email: 'test' }, 'secret', { expiresIn: '1h' });
  console.log('JWT created:', token.substring(0,30) + '...');
}

test().catch(e => console.error('ERROR:', e));
