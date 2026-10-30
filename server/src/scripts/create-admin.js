import readline from "node:readline";
import { hashPassword } from "../auth/password.js";
import { pool } from "../db/pool.js";
import { countAdmins, createUser } from "../users/user.repository.js";
import { validateCreateUser } from "../users/user.validation.js";

/**
 * Creation interactive du premier compte ADMIN.
 *
 * Aucun mot de passe administrateur n'existe dans le code. Le mot de passe
 * est saisi dans le terminal sans etre affiche, puis stocke uniquement
 * sous forme de hash bcrypt dans MySQL.
 * La commande refuse de continuer si un ADMIN existe deja.
 */

function question(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function hiddenQuestion(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("La saisie du mot de passe exige un terminal interactif."));
      return;
    }

    const stdin = process.stdin;
    let value = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };

    const onData = (char) => {
      if (char === "\u0003") {
        cleanup();
        reject(new Error("Creation annulee."));
      } else if (char === "\r" || char === "\n") {
        cleanup();
        resolve(value);
      } else if (char === "\u007f") {
        value = value.slice(0, -1);
      } else if (char >= " ") {
        value += char;
      }
    };

    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
  });
}

try {
  if (!process.stdin.isTTY) {
    throw new Error("Lancez cette commande dans un terminal interactif.");
  }

  const adminCount = await countAdmins();
  if (adminCount > 0) {
    throw new Error("Un compte ADMIN existe deja. Utilisez un ADMIN connecte pour creer d'autres comptes.");
  }

  console.log("Creation du premier administrateur FunBike");
  const name = await question("Nom : ");
  const email = await question("Email : ");
  const password = await hiddenQuestion("Mot de passe (12 caracteres minimum, lettre + chiffre) : ");
  const confirmation = await hiddenQuestion("Confirmez le mot de passe : ");

  if (password !== confirmation) {
    throw new Error("La confirmation du mot de passe ne correspond pas.");
  }

  const input = validateCreateUser({
    name,
    email,
    password,
    role: "ADMIN",
    canDeleteProducts: true,
  });

  const passwordHash = await hashPassword(input.password);
  const admin = await createUser({ ...input, passwordHash });

  console.log(`Administrateur cree : ${admin.name} <${admin.email}> (id ${admin.id}).`);
} catch (error) {
  const details = Array.isArray(error.details) ? ` ${error.details.join(" ")}` : "";
  console.error(`Creation impossible : ${error.message}${details}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
