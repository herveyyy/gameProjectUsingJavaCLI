
package mobs;

import Main.gameTempBattleStats;


public class mob {
     String[] mob = new String[6];
    public int[] id = new int[6];
    public boolean statusAlive;
    public boolean statusEncounter;
    public String name;
    private String skillName;
    private float Health;
    private float Stamina;
    private double damage;
    private double mana = 0;// temp
  
     public String Name(){
   return name;
    }
 public String skillName(){
   return skillName;
    }
public float Health(){

return Health;
}
public double Damage(){


         return damage;


}
public void Appeared(){

this.statusEncounter = true;
}

public void Slime(){
    
    this.name = "Slime";
    this.Health = 20;
    this.Stamina = 10;
    this.skillName = "Smash";

    this.damage = 5;
    this.statusAlive = true;
    }
 public double slimeAttackSmash(){
 
 
        return damage;
 }   
 public void Rabbit(){
    
    this.name = "Rabbit";
    this.Health = 10;
    this.Stamina = 5;
    this.skillName = "Do Nothing";

    this.damage = 0;
    this.statusAlive = true;
    
    }
 public String rabbitAttack(){
 
 
        return "No Damage";
 }
 public void Cat(){
    
    this.name = "Wild Cat";
    this.Health = 15;
    this.Stamina = 25;
    this.skillName = "Cat Slash";
 
    this.damage = 6;
    this.statusAlive = true;

    }
 public double CatAttackSlash(){
 
 
        return damage;
 }
  public void Wolf(){
    
    this.name = "Wolf";
    this.Health = 25;
    this.Stamina = 25;
    this.skillName = "Sharp Claws";
 
    this.damage = 7;
    this.statusAlive = true;
  
    }
 public double WolfAttackSlash(){
 
 
        return damage;
 }
 public void Goblin(){
    
    this.name = "Goblin";
    this.Health = 25;
    this.Stamina = 25;
    this.skillName = "Dagger Swipe";
    this.damage = 10;
    this.statusAlive = true;
   
    }
 public double GoblinAttack(){
 
 
        return damage;
 }


 public void mobList(){
mob[1] = "Slime";
mob[2] = "Rabbit(Harmless)";
mob[3] = "Wild Cat";
mob[4] = "Wolf";
mob[5] = "Goblin";
mob[0] = "Slime";
id[1] = 1;
    id[2] = 2;
    id[3] = 3;
    id[4] = 4;
    id[5] = 5;
    id[0] = 0;
}

public void enemyEncounter(){
    mobList();
 int encounter = 0; 
   encounter = (int)(Math.random() * 5) + 1;
 enemyAppered(encounter, id);
  
 
}
public void enemyFight(){
System.out.println("----------------------------------");
System.out.println("["+name+"]"+ "               " + "Skills://to do " + "\n" );
System.out.println("Health: " + Health + "             " + "Stamina: " + Stamina 
           + "\n" + "Mana: "+ mana);


}

 public void enemyAppered(int key, int[] localArr){
     mobList();
     int j;
    int nElems = 6;//max 
        for(j=0; j<nElems; j++) // for each element,
            if(localArr[j] == key) // found item?
                break; // yes, exit before end
        if(j == nElems) // at the end?
            System.out.println("Encountered nothing.."); // yes
        else
            System.out.println("----------------------------------");
            System.out.println("You encountered a " + mob[key]); // no
            System.out.println("----------------------------------");
            System.out.println();
        switch (key) {
            case 1:
            case 0:
                Slime();
                enemyFight();
                break;
            case 2:
                Rabbit();
                enemyFight();
                break;
            case 3:
                Cat();
                enemyFight();
                break;
            case 4:
                Wolf();
                enemyFight();
                break;
            case 5:
                Goblin();
                enemyFight();
                break;
            default:
                break;
        }
        
    }

       
}
