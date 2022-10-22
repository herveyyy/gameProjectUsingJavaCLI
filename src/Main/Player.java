package Main;


import java.util.Scanner;


public class Player {
    // main attributes of the player.
    public String name;
    protected String className;
    protected double healthpower;
   protected double stamina;
    protected double mana;
    //player stats
  protected int strength;
  protected  int agility;
   protected int intelligence;
    //player possesions and progress
   public int gold;
   public int level;
   protected int skillPoint; 
   public int experiencePoint;
   //skills
    private int n = 4;
   
    String skillName[] = new String[4];
   float skillDamage[] = new float[4];
   float minusMana[] = new float[4];
   public float effect;
   boolean skillEffect;
   public String skillEffectName;
   float minusStamina[] = new float[4];
   public String[] skills = new String[4];
   private boolean addStamina;
    // main attributes of the player.
   
     
    public void setName(String n){
    this.name = n;
    
    }
     public String getName(){
    
    return name;
    }
    public void setClassName(String playerClassName){
    this.className = playerClassName;
    
    }
     public String getClassName(){
    
    
    return className;
    }
    public void setStamina(Double playerStamina){
    this.stamina = playerStamina;
    
    }
    public double getStamina(){
    
    
    return stamina;
    }
    public void setMana(Double playerMana){
    
    this.mana = playerMana;
    }
     public Double getMana(){
    
    
        return mana;
    }
      //player stats
     public void setStrength(int playerStrength){
    
         
    this.strength = playerStrength;
    }
    public int getStrength(){
    
    
        return strength;
    }
     
    public void setAgility(int playerAgility){
    
         
    this.agility = playerAgility;
    }
     public int getAgility(){
  
        return agility;
    } 
    public void setIntelligence(int playerIntelligence){
    
         
    this.intelligence = playerIntelligence;
    }
     public int getIntelligence(){
  
        return intelligence;
    }
       //player possesions and progress
     public void setGold(int playerGold){
   
    this.gold = playerGold;
    }
     public int getGold(){
  
        return gold;
    }
     public void setLevel(int playerLevel){
    this.level = playerLevel;
    }
     public int getLevel(){

        return level;
    }
     public void setSkillPoint(int playerSkillPoint){
    
         
    this.level = playerSkillPoint;
    }
     public int getSkillPoint(){
  
        return skillPoint;
    } 
     public void setExp(int playerExp){
    this.experiencePoint = playerExp;

}
     public int getExp(){


        return experiencePoint;
}
public void setHealthPower(double HP ){
this.healthpower = HP;


}
public double getHealthPower(){
        return healthpower;


}

public void firstSkill(String name, float damage, float mana ){
this.skillName[1] = name;
this.skillDamage[1] = damage;
this.minusMana[1] = mana;

}
public void secondSkill(String name, float damage, float mana  ){
this.skillName[2] = name;
this.skillDamage[2] = damage;
this.minusMana[2] = mana;

}
public void thirdSkill(String name, float damage, float mana){
this.skillName[3] = name;
this.skillDamage[3] = damage;
this.minusMana[3] = mana;

}
public float useSkill(){
    displaySkills();
Scanner in = new Scanner(System.in);
int i = in.nextInt();   
        switch (i) {
            case 1:
                System.out.println("----------------------------------");
                System.out.println("You use " + skillName[i] + "\n" + "Deals " + skillDamage[i] + " of damage.");
                reduceStamina();
                break;
            case 2:
                System.out.println("----------------------------------");
                System.out.println("You use " + skillName[i] + "\n" + "Deals " + skillDamage[i] + " of damage.");
               reduceStamina();
                break;
            case 3:
                System.out.println("----------------------------------");
                System.out.println("You use " + skillName[i] + "\n" + "Deals " + skillDamage[i] + " of damage.");
               reduceStamina();
                break;
            default:
                break;
        }
        return skillDamage[i];

   
}
 public void displaySkills(){
     System.out.println(name + "[" +className+"]"+ "       Skills");
     System.out.println("----------------------------------");
    for(int i = 1; i < n; i++){
               System.out.println( i + ". "+ skillName[i]);
               }
    }

 public double reduceStamina(){
    
 int reduce = 0; 
 if(stamina >70 && this.addStamina == false){
   reduce = (int)(Math.random() * 20) + 1;
   
   
   }else if(stamina <=69 && this.addStamina == false){
     reduce = (int)(Math.random() * 10) + 1;
   
   }else{
   reduce = reduce + 20;
   
   }
        return reduce;
  
 
}

}

